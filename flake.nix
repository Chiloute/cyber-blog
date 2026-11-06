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
      cheapHooks = {
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
    in
    {
      checks = forAllSystems (system: _pkgs: {
        pre-commit-check = git-hooks.lib.${system}.run { src = ./.; hooks = cheapHooks; };
      });

      devShells = forAllSystems (system: pkgs:
        let
          hooksRun = git-hooks.lib.${system}.run {
            src = ./.;
            hooks = cheapHooks // npmHooks pkgs;
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
