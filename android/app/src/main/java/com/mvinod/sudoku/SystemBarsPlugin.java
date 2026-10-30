package com.mvinod.sudoku;

import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Colours the status and navigation bars to match the active in-app theme. */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    @PluginMethod
    public void setColors(PluginCall call) {
        final String hex = call.getString("color", "#000000");
        final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", true));
        getActivity().runOnUiThread(() -> {
            try {
                int c = Color.parseColor(hex);
                Window w = getActivity().getWindow();
                w.setStatusBarColor(c);
                w.setNavigationBarColor(c);
                w.getDecorView().setBackgroundColor(c);
                if (getBridge().getWebView() != null) getBridge().getWebView().setBackgroundColor(c);
                WindowInsetsControllerCompat ic = WindowCompat.getInsetsController(w, w.getDecorView());
                ic.setAppearanceLightStatusBars(!dark);
                ic.setAppearanceLightNavigationBars(!dark);
                call.resolve();
            } catch (Exception e) {
                call.reject("Bad colour: " + hex);
            }
        });
    }
}
