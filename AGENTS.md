<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the existing canvas engine as the shared encounter owner; switching only swaps character-local health, protection, cooldowns, and animation state, never world physics or boss timers.
- Define character attack rules and keyboard selection in src/game/characters.ts and cover them with focused game tests so combat and input boundaries stay consistent.
- Render both characters with original procedural canvas art using the existing ink drawing helpers, keeping sprite dimensions and collision assumptions aligned.
