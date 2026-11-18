package app.gymplan.am.widgets

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * The widgets' copy of the app's data (docs/android-app.md).
 * The app pushes a JSON snapshot; widget actions edit the snapshot here (so widgets update at once)
 * and queue events that the app applies to its real data the next time it opens.
 */
object WidgetStore {
    private const val PREFS = "gym_widgets"
    private const val KEY_STATE = "state"
    private const val KEY_EVENTS = "events"

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)

    /** Sunday-based week start, matching the app. */
    fun weekStart(): String {
        val c = Calendar.getInstance()
        c.add(Calendar.DAY_OF_YEAR, -(c.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY))
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(c.time)
    }

    fun weekStartOf(date: String): String {
        val c = Calendar.getInstance()
        c.time = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(date) ?: return date
        c.add(Calendar.DAY_OF_YEAR, -(c.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY))
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(c.time)
    }

    fun todayIndex(): Int = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY

    @Synchronized
    fun setState(ctx: Context, json: String) {
        prefs(ctx).edit().putString(KEY_STATE, json).apply()
    }

    /** The snapshot, rolled over to a fresh day / week if the app hasn't been opened since. */
    @Synchronized
    fun state(ctx: Context): JSONObject? {
        val raw = prefs(ctx).getString(KEY_STATE, null) ?: return null
        val s = try { JSONObject(raw) } catch (e: Exception) { return null }
        var changed = false
        if (s.optString("date") != today()) {
            s.put("date", today())
            val w = s.getJSONObject("workout")
            w.put("logged", false)
            w.remove("startedAt")
            val items = w.getJSONArray("items")
            for (i in 0 until items.length()) items.getJSONObject(i).put("done", false)
            changed = true
        }
        val week = s.getJSONObject("week")
        if (week.optString("start") != weekStart()) {
            val done = week.optInt("gym", 0) >= week.optInt("goal", 2)
            week.put("streak", if (done) week.optInt("streak", 0) else 0)
            week.put("start", weekStart())
            week.put("gym", 0)
            val days = week.getJSONArray("days")
            for (i in 0 until days.length()) days.getJSONObject(i).put("done", false)
            changed = true
        }
        if (changed) prefs(ctx).edit().putString(KEY_STATE, s.toString()).apply()
        return s
    }

    @Synchronized
    fun takeEvents(ctx: Context): String {
        val raw = prefs(ctx).getString(KEY_EVENTS, "[]") ?: "[]"
        prefs(ctx).edit().putString(KEY_EVENTS, "[]").apply()
        return raw
    }

    @Synchronized
    private fun addEvent(ctx: Context, ev: JSONObject) {
        val arr = try { JSONArray(prefs(ctx).getString(KEY_EVENTS, "[]")) } catch (e: Exception) { JSONArray() }
        ev.put("at", System.currentTimeMillis())
        arr.put(ev)
        prefs(ctx).edit().putString(KEY_EVENTS, arr.toString()).apply()
    }

    @Synchronized
    private fun mutate(ctx: Context, block: (JSONObject) -> JSONObject?) {
        val s = state(ctx) ?: return
        val ev = block(s)
        prefs(ctx).edit().putString(KEY_STATE, s.toString()).apply()
        if (ev != null) addEvent(ctx, ev)
    }

    private fun item(s: JSONObject, key: String): JSONObject? {
        val items = s.getJSONObject("workout").getJSONArray("items")
        for (i in 0 until items.length()) if (items.getJSONObject(i).getString("key") == key) return items.getJSONObject(i)
        return null
    }

    fun toggle(ctx: Context, key: String) = mutate(ctx) { s ->
        val it = item(s, key) ?: return@mutate null
        val done = !it.optBoolean("done")
        it.put("done", done)
        val w = s.getJSONObject("workout")
        if (done && !w.has("startedAt")) w.put("startedAt", System.currentTimeMillis())
        JSONObject().put("type", "toggle").put("key", key).put("done", done)
    }

    fun step(ctx: Context, key: String, delta: Double) = mutate(ctx) { s ->
        val it = item(s, key) ?: return@mutate null
        val cur = if (it.has("weight")) it.getDouble("weight") else 0.0
        val v = Math.max(0.0, Math.round((cur + delta) * 10) / 10.0)
        it.put("weight", v)
        JSONObject().put("type", "weight").put("id", it.getString("id")).put("value", v)
    }

    /** Either/or slot: switch to the next option. */
    fun cycle(ctx: Context, key: String) = mutate(ctx) { s ->
        val it = item(s, key) ?: return@mutate null
        val opts = it.getJSONArray("options")
        if (opts.length() < 2) return@mutate null
        var idx = 0
        for (i in 0 until opts.length()) if (opts.getJSONObject(i).getString("id") == it.getString("id")) idx = i
        val next = opts.getJSONObject((idx + 1) % opts.length())
        it.put("id", next.getString("id")); it.put("name", next.getString("name"))
        // The other option's last weight is unknown here; the app fills it in on next sync.
        it.remove("weight")
        lastLiftWeight(s, next.getString("id"))?.let { w -> it.put("weight", w) }
        JSONObject().put("type", "choose").put("key", key).put("id", next.getString("id"))
    }

    private fun lastLiftWeight(s: JSONObject, id: String): Double? {
        val lifts = s.optJSONArray("lifts") ?: return null
        for (i in 0 until lifts.length()) {
            val l = lifts.getJSONObject(i)
            if (l.getString("id") == id) {
                val ss = l.getJSONArray("sessions")
                return if (ss.length() > 0) ss.getJSONObject(ss.length() - 1).getDouble("value") else null
            }
        }
        return null
    }

    /** Log today's session from the widget. */
    fun finish(ctx: Context) = mutate(ctx) { s ->
        val w = s.getJSONObject("workout")
        val items = w.getJSONArray("items")
        var any = false
        val lifts = s.optJSONArray("lifts") ?: JSONArray()
        for (i in 0 until items.length()) {
            val it = items.getJSONObject(i)
            if (!it.optBoolean("done")) continue
            any = true
            if (it.has("weight")) {
                for (j in 0 until lifts.length()) {
                    val l = lifts.getJSONObject(j)
                    if (l.getString("id") == it.getString("id")) l.getJSONArray("sessions").put(JSONObject().put("date", today()).put("value", it.getDouble("weight")))
                }
            }
            it.put("done", false)
        }
        if (!any) return@mutate null
        w.put("logged", true)
        w.remove("startedAt")
        val week = s.getJSONObject("week")
        week.put("gym", week.optInt("gym") + 1)
        val days = week.getJSONArray("days")
        for (i in 0 until days.length()) {
            val d = days.getJSONObject(i)
            if (d.getInt("day") == todayIndex()) d.put("done", true)
        }
        if (week.optInt("gym") == week.optInt("goal")) week.put("streak", week.optInt("streak") + 1)
        JSONObject().put("type", "finish")
    }

    /** Log today's body weight / waist from the widget. */
    fun logBody(ctx: Context, w: Double?, c: Double?) = mutate(ctx) { s ->
        val body = s.getJSONObject("body")
        val entries = body.getJSONArray("entries")
        var entry: JSONObject? = null
        for (i in 0 until entries.length()) if (entries.getJSONObject(i).getString("date") == today()) entry = entries.getJSONObject(i)
        if (entry == null) { entry = JSONObject().put("date", today()); entries.put(entry) }
        if (w != null) entry.put("w", w)
        if (c != null) entry.put("c", c)
        val ev = JSONObject().put("type", "body").put("date", today())
        if (w != null) ev.put("w", w)
        if (c != null) ev.put("c", c)
        ev
    }

    // ----- Per-widget settings (which lift to show, body draft values) -----
    fun getInt(ctx: Context, key: String, def: Int) = prefs(ctx).getInt(key, def)
    fun putInt(ctx: Context, key: String, v: Int) = prefs(ctx).edit().putInt(key, v).apply()
    fun getDouble(ctx: Context, key: String): Double? = if (prefs(ctx).contains(key)) java.lang.Double.longBitsToDouble(prefs(ctx).getLong(key, 0)) else null
    fun putDouble(ctx: Context, key: String, v: Double?) {
        if (v == null) prefs(ctx).edit().remove(key).apply() else prefs(ctx).edit().putLong(key, java.lang.Double.doubleToRawLongBits(v)).apply()
    }
    fun getString(ctx: Context, key: String): String? = prefs(ctx).getString(key, null)
    fun putString(ctx: Context, key: String, v: String?) {
        if (v == null) prefs(ctx).edit().remove(key).apply() else prefs(ctx).edit().putString(key, v).apply()
    }
    /** Today's item for a slot key. */
    fun item(ctx: Context, key: String): JSONObject? = state(ctx)?.let { item(it, key) }
    fun putLong(ctx: Context, key: String, v: Long) = prefs(ctx).edit().putLong(key, v).apply()
    fun getLong(ctx: Context, key: String) = prefs(ctx).getLong(key, 0L)

    /** Latest logged value (w = weight, c = waist). */
    fun latestBody(s: JSONObject?, field: String): Double? {
        val entries = s?.optJSONObject("body")?.optJSONArray("entries") ?: return null
        for (i in entries.length() - 1 downTo 0) {
            val e = entries.getJSONObject(i)
            if (e.has(field)) return e.getDouble(field)
        }
        return null
    }

    /** Weekly averages of a body field, oldest first (Sunday-based weeks). */
    fun weeklyAverages(s: JSONObject?, field: String): List<Double> {
        val entries = s?.optJSONObject("body")?.optJSONArray("entries") ?: return emptyList()
        val sums = linkedMapOf<String, DoubleArray>()
        for (i in 0 until entries.length()) {
            val e = entries.getJSONObject(i)
            if (!e.has(field)) continue
            val wk = weekStartOf(e.getString("date"))
            val a = sums.getOrPut(wk) { doubleArrayOf(0.0, 0.0) }
            a[0] += e.getDouble(field); a[1] += 1.0
        }
        return sums.toSortedMap().values.map { it[0] / it[1] }.takeLast(10)
    }
}
