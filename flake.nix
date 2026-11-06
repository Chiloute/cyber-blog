{
  description = "Blog dev shell: Node 24, git hooks, Playwright on NixOS";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, git-hooks }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system nixpkgs.legacyPackages.${system});

      # Cheap, self-contained hooks: safe to run in the sandboxed `nix flake check`.
      cheapHooks = pkgs: {
        # Same workflow linters as .github/workflows/workflows-lint.yml, caught before the push.
        actionlint.enable = true;
        zizmor = {
          enable = true;
          name = "zizmor";
          entry = "${pkgs.zizmor}/bin/zizmor --offline .github";
          language = "system";
          pass_filenames = false;
          files = "^\\.github/";
        };
        check-merge-conflicts.enable = true;
        check-json = {
          enable = true;
          excludes = [ "^tsconfig\\.json$" ]; # tsconfig may contain comments
        };
        # Security-focused repo: block committed secrets/tokens.
        ripsecrets.enable = true;
      };

      # npm hooks need node_modules (absent in the sandbox), so they only run via the installed git hooks.
      npmHooks = pkgs:
        let npm = "${pkgs.nodejs_24}/bin/npm"; in {
          eslint = {
            enable = true;
            name = "eslint";
            entry = "${npm} run lint";
            language = "system";
            pass_filenames = false;
            files = "\\.(js|ts|mjs|astro)$";
            stages = [ "pre-commit" ];
          };
          unit-tests = {
            enable = true;
            name = "unit-tests";
            entry = "${npm} test";
            language = "system";
            pass_filenames = false;
            files = "\\.(ts|mjs)$";
            stages = [ "pre-commit" ];
          };
          astro-check = {
            enable = true;
            name = "astro-check";
            entry = "${npm} run check";
            language = "system";
            pass_filenames = false;
            stages = [ "pre-push" ];
          };
        };

      # The production site (dist/). Built offline.
      site = pkgs:
        let lib = pkgs.lib; in
        pkgs.buildNpmPackage {
          pname = "chiloute-blog";
          version = "0.0.1";
          src = lib.fileset.toSource {
            root = ./.;
            fileset = lib.fileset.unions [
              ./src ./public ./scripts ./package.json ./package-lock.json ./astro.config.mjs ./tsconfig.json
            ];
          };
          nodejs = pkgs.nodejs_24;
          # Reads the integrity hashes from package-lock.json: no npmDepsHash to bump on each Dependabot PR.
          npmDeps = pkgs.importNpmLock {
            package = lib.importJSON ./package.json;
            packageLock = lib.importJSON ./package-lock.json;
          };
          npmConfigHook = pkgs.importNpmLock.npmConfigHook;
          npmFlags = [ "--ignore-scripts" ];
          env.ASTRO_TELEMETRY_DISABLED = "1";
          doCheck = true;
          checkPhase = "npm run check:drafts";
          installPhase = "cp -r dist $out";
        };

      # nginx server block for the production site: the only source of the HTTP security and cache headers
      # (a static site cannot send headers itself). Used by nixosModules.default, validated by checks.nginx.
      serverBlock = root:
        let
          # nginx drops inherited add_header as soon as a location sets one: repeat the shared set everywhere.
          headers = ''
            add_header Content-Security-Policy "connect-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" always;
            add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
            add_header X-Content-Type-Options "nosniff" always;
            add_header Referrer-Policy "strict-origin-when-cross-origin" always;
            add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()" always;
            add_header Cross-Origin-Opener-Policy "same-origin" always;
            add_header Cross-Origin-Resource-Policy "same-origin" always;
            add_header X-Frame-Options "DENY" always;
          '';
          cached = maxAge: extra: "${headers}add_header Cache-Control \"public, max-age=${maxAge}\" always;\n${extra}";
        in ''
          server {
            listen 80;
            server_name chiloute.fr;
            root ${root};
            charset utf-8;
            # Behind the Cloudflare Tunnel nginx sees plain HTTP: relative redirects keep the visitor on https.
            absolute_redirect off;
            error_page 404 /404.html;
            ${headers}
            add_header Cache-Control "public, max-age=0, must-revalidate" always;

            location = /sitemap.xml { return 301 /sitemap-index.xml; }
            location /_astro/ { ${cached "31536000, immutable" ""} }
            location /pagefind/ { ${cached "3600" ""} }
            location ~ ^/(shiki\.css|sitemap-index\.xml|sitemap-0\.xml)$ { ${cached "3600" ""} }
            location ~ ^/(writeups/|notes/)?rss\.xml$ { ${cached "3600" "types { application/rss+xml xml; }"} }
            location = /site.webmanifest { ${headers} add_header Cache-Control "public, max-age=0, must-revalidate" always; types { application/manifest+json webmanifest; } }
          }
        '';
    in
    {
      packages = forAllSystems (_system: pkgs: { default = site pkgs; });

      # Server: imports = [ inputs.blog.nixosModules.default ]; (see README, Deployment).
      nixosModules.default = { pkgs, ... }: {
        services.nginx = {
          enable = true;
          # Locked package (the one CI built), not a rebuild with the server's nixpkgs.
          appendHttpConfig = serverBlock self.packages.${pkgs.stdenv.hostPlatform.system}.default;
        };
      };

      checks = forAllSystems (system: pkgs: {
        pre-commit-check = git-hooks.lib.${system}.run { src = ./.; hooks = cheapHooks pkgs; };
        site = self.packages.${system}.default;
        # Syntax check of the production server block (nginx -t in the sandbox).
        nginx = pkgs.runCommand "nginx-config-check" { } ''
          cat > nginx.conf <<'EOF'
          error_log stderr;
          pid /dev/null;
          events { }
          http {
            include ${pkgs.nginx}/conf/mime.types;
            access_log off;
            ${builtins.replaceStrings [ "listen 80;" ] [ "listen 8080;" ] (serverBlock "/var/empty")}
          }
          EOF
          ${pkgs.nginx}/bin/nginx -e stderr -t -p "$PWD" -c "$PWD/nginx.conf" && touch $out
        '';
      });

      devShells = forAllSystems (system: pkgs:
        let
          hooksRun = git-hooks.lib.${system}.run {
            src = ./.;
            hooks = cheapHooks pkgs // npmHooks pkgs;
          };
        in {
          default = pkgs.mkShell {
            packages = [ pkgs.nodejs_24 ] ++ hooksRun.enabledPackages;
            shellHook = hooksRun.shellHook + ''
              ${pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
                export PW_CHROMIUM_PATH="${pkgs.chromium}/bin/chromium"
                export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
              ''}
              echo "node $(node --version)"
            '';
          };
        });
    };
}
