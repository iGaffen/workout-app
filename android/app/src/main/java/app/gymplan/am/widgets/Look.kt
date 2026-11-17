package app.gymplan.am.widgets

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Shader
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.sp
import androidx.glance.text.FontWeight
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/** Brand palette (docs/build-pack.md): obsidian, ink, amethyst lume, champagne gold. */
object Look {
    val obsidian = Color(0xFF07060A)
    val panel = Color(0xFF15111D)
    val chip = Color(0x1FFFFFFF)
    val ink1 = Color(0xFFF1ECF7)
    val ink2 = Color(0xFFA39BB3)
    val ink3 = Color(0xFF7D748F)
    val amethyst = Color(0xFF8B6CFF)
    val onAccent = Color(0xFF120A22)
    val lume = Color(0xFFC9B4FF)
    val gold = Color(0xFFE3C98F)

    fun c(color: Color) = ColorProvider(color)
    fun label(color: Color = ink2) = TextStyle(color = c(color), fontSize = 10.sp, fontWeight = FontWeight.Medium)
    fun body(color: Color = ink1, size: Int = 14, bold: Boolean = false) =
        TextStyle(color = c(color), fontSize = size.sp, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal)

    fun fmt(v: Double): String = if (v == Math.floor(v)) v.toLong().toString() else String.format(java.util.Locale.US, "%.1f", v)
}

/** One-series line chart drawn to a bitmap: area wash, 2 px line, end dot with a ring (build pack §2.11). */
object Charts {
    fun line(values: List<Double>, w: Int, h: Int): Bitmap {
        val bmp = Bitmap.createBitmap(Math.max(w, 10), Math.max(h, 10), Bitmap.Config.ARGB_8888)
        val cv = Canvas(bmp)
        if (values.isEmpty()) return bmp
        val dp = w / 280f
        val padL = 6 * dp; val padR = 12 * dp; val padT = 10 * dp; val padB = 8 * dp
        var lo = values.minOrNull()!!; var hi = values.maxOrNull()!!
        if (hi - lo < 1e-6) { lo -= 1; hi += 1 }
        val span = hi - lo
        lo -= span * 0.15; hi += span * 0.15
        fun x(i: Int) = if (values.size == 1) w / 2f else padL + i * (w - padL - padR) / (values.size - 1)
        fun y(v: Double) = (padT + (hi - v) / (hi - lo) * (h - padT - padB)).toFloat()

        val grid = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF1E1A26.toInt(); strokeWidth = 1f * dp }
        for (k in 0..2) { val gy = padT + k * (h - padT - padB) / 2f; cv.drawLine(padL, gy, w - padR, gy, grid) }

        if (values.size > 1) {
            val line = Path(); val area = Path()
            values.forEachIndexed { i, v -> if (i == 0) { line.moveTo(x(i), y(v)); area.moveTo(x(i), y(v)) } else { line.lineTo(x(i), y(v)); area.lineTo(x(i), y(v)) } }
            area.lineTo(x(values.size - 1), (h - padB)); area.lineTo(x(0), (h - padB)); area.close()
            val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                shader = LinearGradient(0f, padT, 0f, h.toFloat(), 0x339575FF, 0x009575FF, Shader.TileMode.CLAMP)
            }
            cv.drawPath(area, fill)
            val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = 0xFF9575FF.toInt(); style = Paint.Style.STROKE; strokeWidth = 2.2f * dp
                strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND
            }
            cv.drawPath(line, stroke)
        }
        val ex = x(values.size - 1); val ey = y(values.last())
        cv.drawCircle(ex, ey, 6f * dp, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF15111D.toInt() })
        cv.drawCircle(ex, ey, 4.2f * dp, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF9575FF.toInt() })
        return bmp
    }
}
