package app.gymplan.am;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import app.gymplan.am.widgets.WidgetBridgePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Native plugin that connects the app to its home-screen widgets.
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
