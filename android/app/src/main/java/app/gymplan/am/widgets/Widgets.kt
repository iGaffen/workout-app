package app.gymplan.am.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import app.gymplan.am.MainActivity
import org.json.JSONObject

// ---------------------------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------------------------

/** Redraw every widget after the snapshot changes. */
suspend fun refreshAllWidgets(ctx: Context) {
    WorkoutWidgetReceiver.updateAll(ctx)
    refreshGlance(ctx)
}

/** The Glance widgets (summary, lift, body). */
suspend fun refreshGlance(ctx: Context) {
    redraw(ctx, SummaryWidget()); redraw(ctx, LiftWidget()); redraw(ctx, BodyWidget())
}

private val REV = longPreferencesKey("rev")

/**
 * Glance keeps a widget's composition alive between updates, so a plain update() would not re-read our data.
 * Bumping a revision in the widget's own Glance state makes it recompose and read the fresh snapshot.
 */
suspend fun redraw(ctx: Context, w: GlanceAppWidget) {
    GlanceAppWidgetManager(ctx).getGlanceIds(w.javaClass).forEach { id ->
        updateAppWidgetState(ctx, id) { it[REV] = System.nanoTime() }
        w.update(ctx, id)
    }
}

/** Read inside provideContent: subscribes the composition to redraw(). */
@Composable
private fun watchRev() { currentState<Preferences>()[REV] }

private val DELTA = ActionParameters.Key<Double>("delta")
private val FIELD = ActionParameters.Key<String>("field")

@Composable
private fun Shell(content: @Composable () -> Unit) {
    Box(
        modifier = GlanceModifier.fillMaxSize().background(Look.obsidian).cornerRadius(24.dp).padding(12.dp),
    ) { content() }
}

/** A round or pill button: a box with a centred label. */
@Composable
private fun Btn(text: String, onClick: androidx.glance.action.Action, w: Dp, h: Dp = 36.dp, bg: Color = Look.chip, fg: Color = Look.ink1, size: Int = 16) {
    Box(
        modifier = GlanceModifier.width(w).height(h).cornerRadius(h / 2).background(bg).clickable(onClick),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = TextStyle(color = Look.c(fg), fontSize = size.sp, textAlign = TextAlign.Center)) }
}

@Composable
private fun Empty(msg: String) {
    Column(GlanceModifier.fillMaxSize().clickable(actionStartActivity<MainActivity>()), verticalAlignment = Alignment.CenterVertically, horizontalAlignment = Alignment.CenterHorizontally) {
        Text("GYM PLAN", style = Look.label(Look.gold))
        Spacer(GlanceModifier.height(6.dp))
        Text(msg, style = Look.body(Look.ink2, 13), maxLines = 3)
    }
}


// ---------------------------------------------------------------------------------------------
// 2. Week summary: Mon/Wed, gym count, streak, latest weight and waist, weight trend
// ---------------------------------------------------------------------------------------------

class SummaryWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Exact
    override val stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { watchRev(); Shell { SummaryContent(WidgetStore.state(context)) } }
    }
}

@Composable
private fun SummaryContent(s: JSONObject?) {
    if (s == null) { Empty("Open the app once to see your week."); return }
    val ctx = LocalContext.current
    val size = LocalSize.current
    val wk = s.getJSONObject("week")
    val days = wk.getJSONArray("days")
    val weights = WidgetStore.weeklyAverages(s, "w")
    val lw = WidgetStore.latestBody(s, "w"); val lc = WidgetStore.latestBody(s, "c")
    Row(GlanceModifier.fillMaxSize().clickable(actionStartActivity<MainActivity>()), verticalAlignment = Alignment.CenterVertically) {
        Column(GlanceModifier.defaultWeight()) {
            Text("THIS WEEK", style = Look.label(Look.gold))
            Spacer(GlanceModifier.height(4.dp))
            Row {
                for (i in 0 until days.length()) {
                    val d = days.getJSONObject(i)
                    val on = d.optBoolean("done")
                    Text("${if (on) "●" else "○"} ${d.getString("name").uppercase()}  ", style = Look.body(if (on) Look.gold else Look.ink2, 12, true))
                }
            }
            Text("${wk.optInt("gym")} of ${wk.optInt("goal")} gym workouts", style = Look.body(Look.ink1, 13))
            if (wk.optInt("streak") > 0) Text("${wk.optInt("streak")}-week streak", style = Look.body(Look.gold, 12, true))
            Spacer(GlanceModifier.height(4.dp))
            Text(listOfNotNull(lw?.let { "${Look.fmt(it)} kg" }, lc?.let { "${Look.fmt(it)} cm waist" }).joinToString(" · ").ifEmpty { "Log weight to see a trend" }, style = Look.body(Look.ink2, 12), maxLines = 2)
        }
        if (weights.size > 1 && size.width > 220.dp) {
            val density = ctx.resources.displayMetrics.density
            val cw = (size.width.value * 0.45f * density).toInt(); val ch = ((size.height.value - 24) * density).toInt()
            Image(ImageProvider(Charts.line(weights, cw, ch)), "Body weight, weekly average", GlanceModifier.width((size.width.value * 0.45f).dp).height((size.height.value - 24).dp))
        }
    }
}

class SummaryWidgetReceiver : GlanceAppWidgetReceiver() { override val glanceAppWidget: GlanceAppWidget = SummaryWidget() }

// ---------------------------------------------------------------------------------------------
// 3. Lift progress: top weight per session for one exercise, ◀ ▶ to switch
// ---------------------------------------------------------------------------------------------

class LiftWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Exact
    override val stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val wid = GlanceAppWidgetManager(context).getAppWidgetId(id)
        provideContent { watchRev(); Shell { LiftContent(WidgetStore.state(context), WidgetStore.getInt(context, "lift_$wid", 0)) } }
    }
}

@Composable
private fun LiftContent(s: JSONObject?, idxIn: Int) {
    val lifts = s?.optJSONArray("lifts")
    if (lifts == null || lifts.length() == 0) { Empty("Log some weights to see your progress."); return }
    val ctx = LocalContext.current
    val size = LocalSize.current
    val idx = ((idxIn % lifts.length()) + lifts.length()) % lifts.length()
    val l = lifts.getJSONObject(idx)
    val ss = l.getJSONArray("sessions")
    val values = (0 until ss.length()).map { ss.getJSONObject(it).getDouble("value") }
    val unit = if (l.optString("unit").isEmpty()) "" else " kg"
    Column(GlanceModifier.fillMaxSize().clickable(actionStartActivity<MainActivity>())) {
        Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Btn("◀", actionRunCallback<LiftNavAction>(actionParametersOf(DELTA to -1.0)), 32.dp, 32.dp, size = 13)
            Text(l.getString("name"), style = TextStyle(color = Look.c(Look.ink1), fontSize = 14f.sp, textAlign = TextAlign.Center), maxLines = 1, modifier = GlanceModifier.defaultWeight())
            Btn("▶", actionRunCallback<LiftNavAction>(actionParametersOf(DELTA to 1.0)), 32.dp, 32.dp, size = 13)
        }
        if (values.isEmpty()) {
            Box(GlanceModifier.fillMaxWidth().defaultWeight(), contentAlignment = Alignment.Center) { Text("No weights logged yet.", style = Look.body(Look.ink2, 13)) }
        } else {
            val density = ctx.resources.displayMetrics.density
            val hDp = (size.height.value - 64).coerceAtLeast(30f)
            Image(ImageProvider(Charts.line(values, ((size.width.value - 24) * density).toInt(), (hDp * density).toInt())), "${l.getString("name")} progress",
                GlanceModifier.fillMaxWidth().height(hDp.dp))
            Row(GlanceModifier.fillMaxWidth()) {
                Text("Last ${Look.fmt(values.last())}$unit", style = Look.body(Look.ink2, 12), modifier = GlanceModifier.defaultWeight())
                Text("Best ${Look.fmt(values.maxOrNull()!!)}$unit", style = Look.body(Look.gold, 12, true))
            }
        }
    }
}

class LiftNavAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val wid = GlanceAppWidgetManager(context).getAppWidgetId(glanceId)
        val d = (parameters[DELTA] ?: 1.0).toInt()
        WidgetStore.putInt(context, "lift_$wid", WidgetStore.getInt(context, "lift_$wid", 0) + d)
        redraw(context, LiftWidget())
    }
}

class LiftWidgetReceiver : GlanceAppWidgetReceiver() { override val glanceAppWidget: GlanceAppWidget = LiftWidget() }

// ---------------------------------------------------------------------------------------------
// 4. Body log: weight and waist with − / +, saved from the widget
// ---------------------------------------------------------------------------------------------

class BodyWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Exact
    override val stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            watchRev()
            val s = WidgetStore.state(context)
            val w = WidgetStore.getDouble(context, "draft_w") ?: WidgetStore.latestBody(s, "w")
            val c = WidgetStore.getDouble(context, "draft_c") ?: WidgetStore.latestBody(s, "c")
            val savedAgo = System.currentTimeMillis() - WidgetStore.getLong(context, "body_saved_at")
            Shell { BodyContent(s != null, w, c, savedAgo < 60_000) }
        }
    }
}

@Composable
private fun BodyContent(ready: Boolean, w: Double?, c: Double?, justSaved: Boolean) {
    if (!ready) { Empty("Open the app once to start logging."); return }
    Column(GlanceModifier.fillMaxSize().clickable(actionStartActivity<MainActivity>()), verticalAlignment = Alignment.CenterVertically) {
        BodyRow("WEIGHT", w?.let { "${Look.fmt(it)} kg" } ?: "—", "w", 0.1)
        Spacer(GlanceModifier.height(6.dp))
        BodyRow("WAIST", c?.let { "${Look.fmt(it)} cm" } ?: "—", "c", 0.5)
        Spacer(GlanceModifier.height(8.dp))
        Box(
            GlanceModifier.fillMaxWidth().height(40.dp).cornerRadius(20.dp).background(if (justSaved) Look.chip else Look.amethyst).clickable(actionRunCallback<BodySaveAction>()),
            contentAlignment = Alignment.Center,
        ) { Text(if (justSaved) "Saved." else "SAVE TODAY'S ENTRY", style = Look.body(if (justSaved) Look.gold else Look.onAccent, 13, true)) }
    }
}

@Composable
private fun BodyRow(label: String, value: String, field: String, step: Double) {
    Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = Look.label(), modifier = GlanceModifier.width(58.dp))
        Btn("−", actionRunCallback<BodyStepAction>(actionParametersOf(FIELD to field, DELTA to -step)), 36.dp, 36.dp)
        Text(value, style = TextStyle(color = Look.c(Look.ink1), fontSize = 18f.sp, textAlign = TextAlign.Center), modifier = GlanceModifier.defaultWeight())
        Btn("+", actionRunCallback<BodyStepAction>(actionParametersOf(FIELD to field, DELTA to step)), 36.dp, 36.dp, Look.amethyst, Look.onAccent)
    }
}

class BodyStepAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val field = parameters[FIELD] ?: return
        val s = WidgetStore.state(context)
        val key = "draft_$field"
        val cur = WidgetStore.getDouble(context, key) ?: WidgetStore.latestBody(s, field) ?: if (field == "w") 80.0 else 90.0
        WidgetStore.putDouble(context, key, Math.round((cur + (parameters[DELTA] ?: 0.0)) * 10) / 10.0)
        WidgetStore.putLong(context, "body_saved_at", 0)
        redraw(context, BodyWidget())
    }
}
class BodySaveAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val s = WidgetStore.state(context)
        val w = WidgetStore.getDouble(context, "draft_w") ?: WidgetStore.latestBody(s, "w")
        val c = WidgetStore.getDouble(context, "draft_c") ?: WidgetStore.latestBody(s, "c")
        if (w == null && c == null) return
        WidgetStore.logBody(context, w, c)
        WidgetStore.putDouble(context, "draft_w", null); WidgetStore.putDouble(context, "draft_c", null)
        WidgetStore.putLong(context, "body_saved_at", System.currentTimeMillis())
        refreshAllWidgets(context)
    }
}

class BodyWidgetReceiver : GlanceAppWidgetReceiver() { override val glanceAppWidget: GlanceAppWidget = BodyWidget() }
