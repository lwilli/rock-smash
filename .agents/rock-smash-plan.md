# Rock Smash implementation plan

## Goal
Build a lightweight, mobile-friendly 2D incremental game as a pure frontend TypeScript app that can be hosted on GitHub Pages.

## Core gameplay
- One rock appears centered on screen at a time.
- The player taps or clicks to swing the active smasher.
- Each strike causes a hit animation and cracks the rock a little.
- When the rock is fully cracked open, the game reveals the outcome.
- If the rock contains a crystal, the player gains points and a flash effect plays.
- If the rock contains no crystal, the rock simply opens and the loop continues.
- If the player reaches the required score, the next smasher unlocks and becomes the permanent active tool.
- After the outcome resolves, a new random rock appears.

## Visual and interaction goals
- Responsive for mobile and desktop.
- Touch-friendly controls with tap and click support.
- Clear crack progression and reward feedback.
- Stronger smashers have stronger animations and more impactful hits.

## Asset prep
- Keep original art files in assets/originals.
- Prepare a clean sprite folder structure for rocks, crystals, smashers, and effects.
- For the first pass, avoid separate cracked-rock sprite files if they are not available.
- Simulate cracking with procedural overlays, damage states, and internal reveal effects.

## Implementation phases
1. Create the project shell and build tooling.
2. Implement the single-rock game loop and input handling.
3. Add smashing, crack progression, and reward state.
4. Add score, smasher unlocks, and the final win condition.
5. Replace placeholders with actual sprite art and polish the animation feedback.
6. Configure GitHub Pages deployment.

## Scope for version 1
- Pure frontend only.
- No backend or persistence.
- Single-screen experience.
- Focus on the core loop before adding extra features.
