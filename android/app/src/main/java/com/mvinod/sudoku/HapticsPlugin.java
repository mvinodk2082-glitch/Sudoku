package com.mvinod.sudoku;

import android.content.Context;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.Settings;
import android.view.HapticFeedbackConstants;
import android.view.View;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pixel-style haptics. Order of preference for each feel:
 * 1) VibrationEffect.Composition primitives (API 30+, if the actuator supports them),
 * 2) View.performHapticFeedback constants (respects the system touch-feedback switch),
 * 3) predefined effects, 4) a single very short low-amplitude pulse. Never long buzzes.
 */
@CapacitorPlugin(name = "PixelHaptics")
public class HapticsPlugin extends Plugin {
    private Vibrator vib;

    @Override
    public void load() {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 31) {
            VibratorManager vm = (VibratorManager) ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vib = vm != null ? vm.getDefaultVibrator() : null;
        } else {
            vib = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
        }
    }

    private boolean systemHapticsOn() {
        try {
            return Settings.System.getInt(getContext().getContentResolver(), Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) != 0;
        } catch (Exception e) { return true; }
    }

    @PluginMethod
    public void play(PluginCall call) {
        final String feel = call.getString("feel", "tick");
        final boolean strong = Boolean.TRUE.equals(call.getBoolean("strong", false));
        getActivity().runOnUiThread(() -> {
            try { if (systemHapticsOn()) perform(feel, strong ? 1f : 0.6f); } catch (Exception ignored) { }
            call.resolve();
        });
    }

    private View view() { return getBridge().getWebView(); }

    private boolean viewFeedback(int constant) {
        View v = view();
        return v != null && v.performHapticFeedback(constant);
    }

    private boolean primitives(int... ids) {
        return Build.VERSION.SDK_INT >= 30 && vib != null && vib.hasVibrator() && vib.areAllPrimitivesSupported(ids);
    }

    private void vibrate(VibrationEffect e) {
        if (vib == null || !vib.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= 33) vib.vibrate(e, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH));
        else vib.vibrate(e);
    }

    private static float c(float v) { return Math.max(0f, Math.min(1f, v)); }

    private void perform(String feel, float s) {
        final int TICK = VibrationEffect.Composition.PRIMITIVE_TICK;
        final int CLICK = VibrationEffect.Composition.PRIMITIVE_CLICK;
        switch (feel) {
            case "select":
                if (!viewFeedback(s >= 1f ? HapticFeedbackConstants.KEYBOARD_TAP : HapticFeedbackConstants.CLOCK_TICK)) fallback(8, s);
                break;
            case "key":
                if (!viewFeedback(HapticFeedbackConstants.VIRTUAL_KEY)) fallback(10, s);
                break;
            case "place":
                if (primitives(CLICK)) vibrate(VibrationEffect.startComposition().addPrimitive(CLICK, c(s >= 1f ? 0.9f : 0.55f)).compose());
                else if (!viewFeedback(HapticFeedbackConstants.KEYBOARD_TAP)) predefinedOr(VibrationEffect.EFFECT_CLICK, 12, s);
                break;
            case "note":
            case "low":
                if (Build.VERSION.SDK_INT >= 31 && primitives(VibrationEffect.Composition.PRIMITIVE_LOW_TICK))
                    vibrate(VibrationEffect.startComposition().addPrimitive(VibrationEffect.Composition.PRIMITIVE_LOW_TICK, c(feel.equals("note") ? s : s * 0.75f)).compose());
                else if (!viewFeedback(Build.VERSION.SDK_INT >= 27 ? HapticFeedbackConstants.TEXT_HANDLE_MOVE : HapticFeedbackConstants.CLOCK_TICK)) fallback(6, s * 0.7f);
                break;
            case "wrong":
                if (Build.VERSION.SDK_INT >= 31 && primitives(VibrationEffect.Composition.PRIMITIVE_LOW_TICK)) {
                    int low = VibrationEffect.Composition.PRIMITIVE_LOW_TICK;
                    vibrate(VibrationEffect.startComposition().addPrimitive(low, c(s * 1.2f)).addPrimitive(low, c(s), 70).compose());
                } else if (Build.VERSION.SDK_INT >= 30 && viewFeedback(HapticFeedbackConstants.REJECT)) {
                    // done
                } else predefinedOr(VibrationEffect.EFFECT_DOUBLE_CLICK, 10, s);
                break;
            case "unit":
                if (primitives(TICK, CLICK)) vibrate(VibrationEffect.startComposition()
                        .addPrimitive(TICK, c(0.3f * s / 0.6f)).addPrimitive(TICK, c(0.5f * s / 0.6f), 45)
                        .addPrimitive(CLICK, c(0.7f * s / 0.6f), 45).compose());
                else predefinedOr(VibrationEffect.EFFECT_CLICK, 12, s);
                break;
            case "solved":
                if (primitives(TICK, CLICK, VibrationEffect.Composition.PRIMITIVE_SLOW_RISE)) vibrate(VibrationEffect.startComposition()
                        .addPrimitive(VibrationEffect.Composition.PRIMITIVE_SLOW_RISE, c(0.35f * s / 0.6f))
                        .addPrimitive(CLICK, c(0.8f * s / 0.6f), 40)
                        .addPrimitive(TICK, c(0.4f * s / 0.6f), 120)
                        .addPrimitive(TICK, c(0.3f * s / 0.6f), 90).compose());
                else if (primitives(TICK, CLICK)) vibrate(VibrationEffect.startComposition()
                        .addPrimitive(TICK, c(0.4f)).addPrimitive(CLICK, c(0.8f * s / 0.6f), 60).addPrimitive(TICK, c(0.4f), 120).compose());
                else if (!(Build.VERSION.SDK_INT >= 30 && viewFeedback(HapticFeedbackConstants.CONFIRM)))
                    predefinedOr(VibrationEffect.EFFECT_HEAVY_CLICK, 14, s);
                break;
            default:
                if (!viewFeedback(HapticFeedbackConstants.CLOCK_TICK)) fallback(8, s);
        }
    }

    private void predefinedOr(int effect, int ms, float s) {
        if (Build.VERSION.SDK_INT >= 29) vibrate(VibrationEffect.createPredefined(effect));
        else fallback(ms, s);
    }

    private void fallback(int ms, float s) {
        if (Build.VERSION.SDK_INT >= 26) {
            int amp = (vib != null && vib.hasAmplitudeControl()) ? Math.max(1, Math.round(255 * 0.35f * s)) : VibrationEffect.DEFAULT_AMPLITUDE;
            vibrate(VibrationEffect.createOneShot(Math.min(ms, 14), amp));
        } else if (vib != null && vib.hasVibrator()) {
            vib.vibrate(Math.min(ms, 14));
        }
    }
}
