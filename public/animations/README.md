# Rive Animation Files

This directory contains Rive animation files for the SoundBridge website.

## File Placement

Place your `.riv` files in this directory:
- `public/animations/soundbridge-logo.riv` (or whatever you name your logo animation)

## Usage

The Rive logo component is already set up and ready to use. It will automatically load your animation file from this directory.

## Component Configuration

The `RiveLogo` component in `src/components/ui/RiveLogo.tsx` is configured to:
- Load animations from `/animations/soundbridge-logo.riv`
- Use state machine "State Machine 1" (update this if your Rive file uses a different state machine name)
- Autoplay and loop by default
- Be responsive for both desktop and mobile

## Customization

If your Rive file has different settings, you can update the component:
1. Change the file path in the `src` property
2. Update the `stateMachines` name to match your Rive file
3. Add any boolean inputs or triggers as needed

## File Size Optimization

For best performance:
- Keep animation files under 1MB when possible
- Use optimized assets in your Rive animations
- Consider creating separate animations for different screen sizes if needed
