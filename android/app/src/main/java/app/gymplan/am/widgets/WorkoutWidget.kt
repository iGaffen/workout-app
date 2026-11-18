package app.gymplan.am.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import app.gymplan.am.MainActivity
import app.gymplan.am.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * The workout widget, built on plain RemoteViews so every tap redraws within a frame or two:
 * the tap arrives as a broadcast, we edit the snapshot and push new views straight away.
 *
 * Two modes per widget:
 *  - list: today's exercises, tick / − + / switch, and Finish workout;
 *  - card: one exercise with its looping 3D animation (frames rendered by the app), weight, cues and Done.
 */
class WorkoutWidgetReceiver : AppWidgetProvider() {

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { render(ctx, mgr, it) }
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        ids.forEach { WidgetStore.putString(ctx, cardKey(it), null) }
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != ACTION) return super.onReceive(ctx, intent)
        val wid = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        val op = intent.getStringExtra(EXTRA_OP) ?: return
        val key = intent.getStringExtra(EXTRA_KEY) ?: ""
        val step = WidgetStore.state(ctx)?.optJSONObject("workout")?.optDouble("step", 2.5) ?: 2.5
        var others = false
        when (op) {
            "toggle" -> { WidgetStore.toggle(ctx, key); others = true }
            "done" -> { // from the card: mark done and go back to the list
                if (WidgetStore.item(ctx, key)?.optBoolean("done") != true) WidgetStore.toggle(ctx, key)
                WidgetStore.putString(ctx, cardKey(wid), null); others = true
            }
            "plus" -> WidgetStore.step(ctx, key, step)
            "minus" -> WidgetStore.step(ctx, key, -step)
            "cycle" -> WidgetStore.cycle(ctx, key)
            "open" -> WidgetStore.putString(ctx, cardKey(wid), key)
            "back" -> WidgetStore.putString(ctx, cardKey(wid), null)
            "finish" -> { WidgetStore.finish(ctx); WidgetStore.putString(ctx, cardKey(wid), null); others = true }
        }
        // Redraw the tapped widget first, synchronously, so the change shows at once.
        val mgr = AppWidgetManager.getInstance(ctx)
        if (wid != AppWidgetManager.INVALID_APPWIDGET_ID) render(ctx, mgr, wid)
        ids(ctx).filter { it != wid }.forEach { render(ctx, mgr, it) }
        if (others) {
            val pending = goAsync()
            CoroutineScope(Dispatchers.Default).launch { try { refreshGlance(ctx) } finally { pending.finish() } }
        }
    }

    companion object {
        const val ACTION = "app.gymplan.am.WORKOUT_WIDGET"
        private const val EXTRA_OP = "op"
        private const val EXTRA_KEY = "key"
        private fun cardKey(wid: Int) = "card_$wid"

        private fun ids(ctx: Context): IntArray =
            AppWidgetManager.getInstance(ctx).getAppWidgetIds(ComponentName(ctx, WorkoutWidgetReceiver::class.java))

        /** Redraw every workout widget (after the app pushes a new snapshot or new frames). */
        fun updateAll(ctx: Context) {
            val mgr = AppWidgetManager.getInstance(ctx)
            ids(ctx).forEach { render(ctx, mgr, it) }
        }

        private fun broadcast(ctx: Context, wid: Int, op: String, key: String = ""): PendingIntent {
            val i = Intent(ctx, WorkoutWidgetReceiver::class.java)
                .setAction(ACTION)
                .setData(Uri.parse("gymplan://workout/$wid/$op/${Uri.encode(key)}")) // unique per button
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, wid)
                .putExtra(EXTRA_OP, op).putExtra(EXTRA_KEY, key)
            return PendingIntent.getBroadcast(ctx, 0, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        /** Template for the list rows; each row fills in its own op and key. Must be mutable. */
        private fun template(ctx: Context, wid: Int): PendingIntent {
            val i = Intent(ctx, WorkoutWidgetReceiver::class.java)
                .setAction(ACTION)
                .setData(Uri.parse("gymplan://workout/$wid/list"))
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, wid)
            return PendingIntent.getBroadcast(ctx, wid, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
        }

        private fun fill(op: String, key: String = "") = Intent().putExtra(EXTRA_OP, op).putExtra(EXTRA_KEY, key)

        private fun openApp(ctx: Context): PendingIntent = PendingIntent.getActivity(
            ctx, 1, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        fun render(ctx: Context, mgr: AppWidgetManager, wid: Int) {
            val rv = RemoteViews(ctx.packageName, R.layout.widget_workout)
            val s = WidgetStore.state(ctx)
            // Anything that isn't a button opens the app.
            listOf(R.id.w_root, R.id.w_title, R.id.w_count, R.id.c_name, R.id.c_meta, R.id.c_cues, R.id.c_count)
                .forEach { v -> rv.setOnClickPendingIntent(v, openApp(ctx)) }
            if (s == null) {
                showList(rv)
                rv.setViewVisibility(R.id.w_list, View.GONE)
                rv.setViewVisibility(R.id.w_message, View.VISIBLE)
                rv.setTextViewText(R.id.w_message, "Open the app once to set up your workout.")
                rv.setOnClickPendingIntent(R.id.w_message, openApp(ctx))
                rv.setTextViewText(R.id.w_count, "")
                mgr.updateAppWidget(wid, rv)
                return
            }
            val w = s.getJSONObject("workout")
            val arr = w.getJSONArray("items")
            val items = (0 until arr.length()).map { arr.getJSONObject(it) }
            val card = WidgetStore.getString(ctx, cardKey(wid))?.let { k -> items.firstOrNull { it.getString("key") == k } }
            if (card != null) renderCard(ctx, rv, wid, s, card, items) else renderList(ctx, rv, wid, s, items)
            try {
                mgr.updateAppWidget(wid, rv)
            } catch (e: IllegalArgumentException) {
                // Too much bitmap memory for this launcher: show the card without the animation.
                if (card != null) {
                    val rv2 = RemoteViews(ctx.packageName, R.layout.widget_workout)
                    rv2.setOnClickPendingIntent(R.id.w_root, openApp(ctx))
                    renderCard(ctx, rv2, wid, s, card, items, animate = false)
                    mgr.updateAppWidget(wid, rv2)
                }
            }
        }

        private fun showList(rv: RemoteViews) {
            rv.setViewVisibility(R.id.w_list_mode, View.VISIBLE)
            rv.setViewVisibility(R.id.w_card_mode, View.GONE)
        }

        private fun renderList(ctx: Context, rv: RemoteViews, wid: Int, s: JSONObject, items: List<JSONObject>) {
            showList(rv)
            val w = s.getJSONObject("workout")
            val done = items.count { it.optBoolean("done") }
            val all = done == items.size && items.isNotEmpty()
            // After a session is logged the list stays, reset, ready for the next workout.
            val justLogged = w.optBoolean("logged") && done == 0
            rv.setTextViewText(R.id.w_count, if (justLogged) "✓ LOGGED" else "$done/${items.size}")
            rv.setTextColor(R.id.w_count, if (all || justLogged) Look.GOLD else Look.INK1)
            rv.setViewVisibility(R.id.w_list, View.VISIBLE)
            rv.setViewVisibility(R.id.w_message, View.GONE)

            val step = w.optDouble("step", 2.5)
            // Not-done first, then done, like the app.
            val ordered = items.filter { !it.optBoolean("done") } + items.filter { it.optBoolean("done") }
            val b = RemoteViews.RemoteCollectionItems.Builder().setHasStableIds(true).setViewTypeCount(2)
            ordered.forEach { b.addItem(it.getString("key").hashCode().toLong(), row(ctx, it, step)) }
            val f = RemoteViews(ctx.packageName, R.layout.widget_workout_footer)
            f.setInt(R.id.f_finish, "setBackgroundResource", if (all) R.drawable.w_pill_gold else if (done > 0) R.drawable.w_pill_accent else R.drawable.w_pill)
            f.setTextColor(R.id.f_finish, if (done > 0) Look.ON_ACCENT else Look.INK3)
            f.setOnClickFillInIntent(R.id.f_finish, fill("finish"))
            b.addItem(Long.MIN_VALUE, f)
            rv.setRemoteAdapter(R.id.w_list, b.build())
            rv.setPendingIntentTemplate(R.id.w_list, template(ctx, wid))
        }

        private fun row(ctx: Context, it: JSONObject, step: Double): RemoteViews {
            val key = it.getString("key")
            val isDone = it.optBoolean("done")
            val weighted = it.optString("kind") != "none"
            val r = RemoteViews(ctx.packageName, R.layout.widget_workout_row)
            r.setTextViewText(R.id.r_name, it.getString("name"))
            r.setTextColor(R.id.r_name, if (isDone) Look.INK3 else Look.INK1)
            r.setTextViewText(R.id.r_sub, if (weighted) "${it.optString("reps")} · ${weightText(it)}" else it.optString("reps"))
            r.setOnClickFillInIntent(R.id.r_text, fill("open", key))
            val showStep = weighted && !isDone
            r.setViewVisibility(R.id.r_minus, if (showStep) View.VISIBLE else View.GONE)
            r.setViewVisibility(R.id.r_plus, if (showStep) View.VISIBLE else View.GONE)
            if (showStep) {
                r.setOnClickFillInIntent(R.id.r_minus, fill("minus", key))
                r.setOnClickFillInIntent(R.id.r_plus, fill("plus", key))
            }
            r.setTextViewText(R.id.r_check, if (isDone) "✓" else "")
            r.setInt(R.id.r_check, "setBackgroundResource", if (isDone) R.drawable.w_check_on else R.drawable.w_check_off)
            r.setOnClickFillInIntent(R.id.r_check, fill("toggle", key))
            val opts = it.optJSONArray("options")?.length() ?: 0
            r.setViewVisibility(R.id.r_switch, if (opts > 1 && !isDone) View.VISIBLE else View.GONE)
            if (opts > 1 && !isDone) r.setOnClickFillInIntent(R.id.r_switch, fill("cycle", key))
            return r
        }

        private fun renderCard(ctx: Context, rv: RemoteViews, wid: Int, s: JSONObject, it: JSONObject, items: List<JSONObject>, animate: Boolean = true) {
            rv.setViewVisibility(R.id.w_list_mode, View.GONE)
            rv.setViewVisibility(R.id.w_card_mode, View.VISIBLE)
            val key = it.getString("key")
            val id = it.getString("id")
            val isDone = it.optBoolean("done")
            val weighted = it.optString("kind") != "none"
            val done = items.count { x -> x.optBoolean("done") }

            rv.setOnClickPendingIntent(R.id.c_back, broadcast(ctx, wid, "back"))
            rv.setTextViewText(R.id.c_count, "$done/${items.size}")
            rv.setTextViewText(R.id.c_name, it.getString("name"))

            val info = s.getJSONObject("workout").optJSONObject("info")?.optJSONObject(id)
            val muscles = info?.optString("muscles").orEmpty()
            rv.setTextViewText(R.id.c_meta, listOf(it.optString("reps"), muscles).filter { m -> m.isNotEmpty() }.joinToString(" · "))
            val cues = info?.optJSONArray("cues")
            val cueText = if (cues == null) "" else (0 until minOf(cues.length(), 3)).joinToString("\n") { i -> "${ROMAN[i]}  ${cues.getString(i)}" }
            rv.setTextViewText(R.id.c_cues, cueText)
            rv.setViewVisibility(R.id.c_cues, if (cueText.isEmpty()) View.GONE else View.VISIBLE)

            // Animation: a flipbook of frames rendered by the app.
            rv.removeAllViews(R.id.c_anim)
            val frames = if (animate) Frames.load(ctx, id) else null
            if (frames != null) {
                frames.bitmaps.forEach { bmp ->
                    val f = RemoteViews(ctx.packageName, R.layout.widget_frame)
                    f.setImageViewBitmap(R.id.frame, bmp)
                    rv.addView(R.id.c_anim, f)
                }
                rv.setInt(R.id.c_anim, "setFlipInterval", frames.intervalMs)
                rv.setViewVisibility(R.id.c_anim, View.VISIBLE)
                rv.setViewVisibility(R.id.c_noanim, View.GONE)
            } else {
                rv.setViewVisibility(R.id.c_anim, View.GONE)
                rv.setViewVisibility(R.id.c_noanim, View.VISIBLE)
                rv.setTextViewText(R.id.c_noanim, if (animate) "Open the app once to load the animation." else "")
            }

            rv.setViewVisibility(R.id.c_weight_row, if (weighted) View.VISIBLE else View.GONE)
            if (weighted) {
                rv.setTextViewText(R.id.c_weight, weightText(it))
                rv.setOnClickPendingIntent(R.id.c_minus, broadcast(ctx, wid, "minus", key))
                rv.setOnClickPendingIntent(R.id.c_plus, broadcast(ctx, wid, "plus", key))
                val base = it.optString("baseLabel")
                rv.setTextViewText(R.id.c_weight_hint, when (it.optString("kind")) {
                    "plates" -> if (base.isNotEmpty()) "plates, plus $base" else "plates"
                    "stack" -> "on the stack"
                    "dumbbell" -> "per dumbbell"
                    else -> ""
                })
            }
            val opts = it.optJSONArray("options")?.length() ?: 0
            rv.setViewVisibility(R.id.c_switch, if (opts > 1) View.VISIBLE else View.GONE)
            if (opts > 1) rv.setOnClickPendingIntent(R.id.c_switch, broadcast(ctx, wid, "cycle", key))
            rv.setTextViewText(R.id.c_done, if (isDone) "✓ DONE · TAP TO UNDO" else "MARK DONE")
            rv.setInt(R.id.c_done, "setBackgroundResource", if (isDone) R.drawable.w_pill else R.drawable.w_pill_accent)
            rv.setTextColor(R.id.c_done, if (isDone) Look.GOLD else Look.ON_ACCENT)
            rv.setOnClickPendingIntent(R.id.c_done, broadcast(ctx, wid, if (isDone) "toggle" else "done", key))
        }

        private val ROMAN = arrayOf("i", "ii", "iii")
    }
}

internal fun weightText(it: JSONObject): String {
    if (!it.has("weight")) return "—"
    val w = it.getDouble("weight")
    return when (it.optString("kind")) {
        "stack" -> Look.fmt(w)
        else -> "${Look.fmt(w)} kg"
    }
}
