package app.gymplan.am.widgets

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import java.io.File

/**
 * Animation frames for the workout widget's exercise card. The app renders its 3D mannequin into
 * a short loop of images per exercise (src/native/frames.ts); the widget plays them as a flipbook.
 */
object Frames {
    private const val DIR = "widget_frames_v1"

    class Loop(val bitmaps: List<Bitmap>, val intervalMs: Int)

    private var cacheId: String? = null
    private var cache: Loop? = null

    private fun dir(ctx: Context, id: String) = File(File(ctx.filesDir, DIR), id.replace(Regex("[^A-Za-z0-9_-]"), "_"))

    @Synchronized
    fun save(ctx: Context, id: String, intervalMs: Int, frames: List<String>) {
        val d = dir(ctx, id)
        d.deleteRecursively(); d.mkdirs()
        frames.forEachIndexed { i, url -> File(d, "$i.img").writeBytes(Base64.decode(url.substringAfter(","), Base64.DEFAULT)) }
        File(d, "meta").writeText("${frames.size} $intervalMs")
        if (cacheId == id) { cacheId = null; cache = null }
    }

    /** Ids with a complete set of frames. */
    fun ids(ctx: Context): List<String> =
        File(ctx.filesDir, DIR).listFiles()?.filter { File(it, "meta").exists() }?.map { it.name } ?: emptyList()

    @Synchronized
    fun load(ctx: Context, id: String): Loop? {
        if (cacheId == id) return cache
        val d = dir(ctx, id)
        val meta = File(d, "meta").takeIf { it.exists() }?.readText()?.split(" ") ?: return null
        val n = meta[0].toIntOrNull() ?: return null
        val ms = meta.getOrNull(1)?.toIntOrNull() ?: 130
        val bmps = (0 until n).mapNotNull { BitmapFactory.decodeFile(File(d, "$it.img").path) }
        if (bmps.isEmpty()) return null
        return Loop(bmps, ms).also { cacheId = id; cache = it }
    }
}
