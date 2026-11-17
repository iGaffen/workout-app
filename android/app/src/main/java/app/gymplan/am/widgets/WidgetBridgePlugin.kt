package app.gymplan.am.widgets

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** JS ↔ widgets: the app pushes a fresh snapshot, and takes the actions queued by widgets. */
@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {
    @PluginMethod
    fun pushState(call: PluginCall) {
        val state = call.getString("state") ?: return call.reject("missing state")
        WidgetStore.setState(context, state)
        val ctx = context.applicationContext
        CoroutineScope(Dispatchers.Default).launch { refreshAllWidgets(ctx) }
        call.resolve()
    }

    @PluginMethod
    fun takeEvents(call: PluginCall) {
        val ret = JSObject()
        ret.put("events", WidgetStore.takeEvents(context))
        call.resolve(ret)
    }
}
