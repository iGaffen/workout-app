package app.gymplan.am.widgets

import com.getcapacitor.JSArray
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
        val state = call.getString("state")
        if (state == null) { call.reject("missing state"); return }
        WidgetStore.setState(context, state)
        val ctx = context.applicationContext
        CoroutineScope(Dispatchers.Default).launch { refreshAllWidgets(ctx) }
        call.resolve()
    }

    /** Store one exercise's animation loop for the widget card. */
    @PluginMethod
    fun saveFrames(call: PluginCall) {
        val id = call.getString("id")
        val arr = call.getArray("frames")
        if (id == null || arr == null) { call.reject("missing id or frames"); return }
        val frames = (0 until arr.length()).map { arr.getString(it) }
        val ctx = context.applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            Frames.save(ctx, id, call.getInt("interval") ?: 130, frames)
            WorkoutWidgetReceiver.updateAll(ctx)
            call.resolve()
        }
    }

    @PluginMethod
    fun listFrames(call: PluginCall) {
        val ret = JSObject()
        // Stored flipbooks, plus any asked-about exercise that has a bundled loop (no need to render those).
        val ids = JSArray().apply { Frames.ids(context).forEach { put(it) } }
        call.getArray("ids")?.let { asked -> for (i in 0 until asked.length()) asked.optString(i).takeIf { Frames.bundledLayout(context, it) != 0 }?.let { ids.put(it) } }
        ret.put("ids", ids)
        call.resolve(ret)
    }

    @PluginMethod
    fun takeEvents(call: PluginCall) {
        val ret = JSObject()
        ret.put("events", WidgetStore.takeEvents(context))
        call.resolve(ret)
    }
}
