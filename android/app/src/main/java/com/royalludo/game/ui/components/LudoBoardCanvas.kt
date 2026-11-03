package com.royalludo.game.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.royalludo.game.model.*
import com.royalludo.game.rules.BoardGeometry
import com.royalludo.game.skills.SkillEngine
import kotlin.math.hypot

@Composable
fun LudoBoardCanvas(
    gameState: GameState,
    onRollCenterDice: () -> Unit,
    onSelectMove: (LegalMove) -> Unit,
    onSelectShieldToken: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val activePlayer = gameState.players.getOrNull(gameState.currentPlayerIndex)
    val movableMap = if (activePlayer?.type == PlayerType.HUMAN && gameState.turnPhase == TurnPhase.SELECTING_MOVE) {
        gameState.legalMoves.associateBy { it.tokenId }
    } else emptyMap()

    val shieldCandidates = if (activePlayer?.type == PlayerType.HUMAN && gameState.turnPhase == TurnPhase.SELECTING_SHIELD_TOKEN) {
        SkillEngine.eligibleShieldTokens(activePlayer).map { it.id }.toSet()
    } else emptySet()

    val rollProgress = remember { Animatable(1f) }
    LaunchedEffect(gameState.turnPhase) {
        if (gameState.turnPhase == TurnPhase.ROLLING) {
            rollProgress.snapTo(0f)
            rollProgress.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 920, easing = FastOutSlowInEasing)
            )
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .shadow(16.dp, RoundedCornerShape(20.dp))
            .border(10.dp, Color(0xFF633C19), RoundedCornerShape(20.dp)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(gameState) {
                    detectTapGestures { tapOffset ->
                        val cellPx = size.width / 15f
                        // Center physical dice tap check
                        val centerPx = size.width / 2f
                        if (hypot(tapOffset.x - centerPx, tapOffset.y - centerPx) <= cellPx * 1.4f &&
                            activePlayer?.type == PlayerType.HUMAN &&
                            gameState.turnPhase == TurnPhase.WAITING_FOR_ROLL
                        ) {
                            onRollCenterDice()
                            return@detectTapGestures
                        }

                        val allTokens = gameState.players.flatMap { it.tokens }
                        val hit = allTokens.firstOrNull { token ->
                            val cell = BoardGeometry.resolveTokenCell(token)
                            val cx = (cell.col + 0.5f) * cellPx
                            val cy = (cell.row + 0.5f) * cellPx
                            hypot(tapOffset.x - cx, tapOffset.y - cy) <= cellPx * 0.65f &&
                                (token.id in movableMap || token.id in shieldCandidates)
                        }
                        if (hit != null) {
                            if (hit.id in shieldCandidates) {
                                onSelectShieldToken(hit.id)
                            } else {
                                movableMap[hit.id]?.let(onSelectMove)
                            }
                        }
                    }
                }
        ) {
            val cell = size.width / 15f

            // Warm Cream & Beige Neo Classic Surface
            drawRect(color = Color(0xFFFAF2DF), size = size)

            // 52 Shared Track Cells with Dark Brown Grid Lines
            BoardGeometry.mainTrack.forEachIndexed { idx, grid ->
                val startOwner = BoardGeometry.startTrackOffset.entries.firstOrNull { it.value == idx }?.key
                val bgColor = when {
                    startOwner != null -> Color(startOwner.primaryHex)
                    idx in BoardGeometry.safeTrackIndices -> Color(0xFFEAD7B3)
                    else -> if (((grid.row + grid.col).toInt()) % 2 == 0) Color(0xFFFDF7E7) else Color(0xFFF4E8CD)
                }
                val topLeft = Offset(grid.col * cell, grid.row * cell)
                drawRect(color = bgColor, topLeft = topLeft, size = Size(cell, cell))
                drawRect(
                    color = Color(0xFF3B2313),
                    topLeft = topLeft,
                    size = Size(cell, cell),
                    style = Stroke(width = 2.5f)
                )
            }

            // Four Colored Home Paths
            BoardGeometry.homeStretches.forEach { (color, cells) ->
                cells.forEach { grid ->
                    val topLeft = Offset(grid.col * cell, grid.row * cell)
                    drawRect(color = Color(color.primaryHex), topLeft = topLeft, size = Size(cell, cell))
                    drawRect(color = Color(0xFF3B2313), topLeft = topLeft, size = Size(cell, cell), style = Stroke(width = 2.5f))
                }
            }

            // Four Neo Classic Corner Bases: Blue TL, Yellow TR, Red BL, Green BR
            val bases = listOf(
                Triple(PlayerColor.BLUE, 0f, 0f),
                Triple(PlayerColor.YELLOW, 0f, 9f),
                Triple(PlayerColor.RED, 9f, 0f),
                Triple(PlayerColor.GREEN, 9f, 9f)
            )
            for ((pColor, r, c) in bases) {
                val baseOffset = Offset(c * cell, r * cell)
                val baseSize = Size(6 * cell, 6 * cell)
                drawRect(color = Color(pColor.primaryHex), topLeft = baseOffset, size = baseSize)
                drawRect(color = Color(0xFF2F1B0C), topLeft = baseOffset, size = baseSize, style = Stroke(width = 4f))

                // Cream Rounded Interior
                drawRoundRect(
                    color = Color(0xFFFCF5E3),
                    topLeft = Offset((c + 0.74f) * cell, (r + 0.65f) * cell),
                    size = Size(4.52f * cell, 4.2f * cell),
                    cornerRadius = CornerRadius(cell * 0.42f, cell * 0.42f)
                )
                BoardGeometry.yardSlots.getValue(pColor).forEach { slot ->
                    val slotCenter = Offset((slot.col + 0.5f) * cell, (slot.row + 0.5f) * cell)
                    drawCircle(color = Color(0xFFF3E7CC), radius = cell * 0.4f, center = slotCenter)
                    drawCircle(color = Color(pColor.primaryHex), radius = cell * 0.4f, center = slotCenter, style = Stroke(width = 4f))
                }
            }

            // Four-Color Central Finishing Triangles
            val center = Offset(7.5f * cell, 7.5f * cell)
            val cLeft = 6f * cell
            val cRight = 9f * cell
            val cTop = 6f * cell
            val cBottom = 9f * cell

            val triangles = listOf(
                PlayerColor.BLUE to listOf(Offset(cLeft, cTop), center, Offset(cLeft, cBottom)),
                PlayerColor.YELLOW to listOf(Offset(cLeft, cTop), Offset(cRight, cTop), center),
                PlayerColor.GREEN to listOf(Offset(cRight, cTop), Offset(cRight, cBottom), center),
                PlayerColor.RED to listOf(Offset(cLeft, cBottom), Offset(cRight, cBottom), center)
            )
            for ((tColor, pts) in triangles) {
                val path = Path().apply {
                    moveTo(pts[0].x, pts[0].y)
                    lineTo(pts[1].x, pts[1].y)
                    lineTo(pts[2].x, pts[2].y)
                    close()
                }
                drawPath(path = path, color = Color(tColor.primaryHex))
            }

            // Center Wooden Dice Plinth
            drawCircle(color = Color(0xFFF6E9CE), radius = cell * 0.82f, center = center)
            drawCircle(color = Color(0xFF5C3818), radius = cell * 0.82f, center = center, style = Stroke(width = 4f))

            // 3D Raised Circular Tokens
            gameState.players.flatMap { it.tokens }.forEach { token ->
                val pos = BoardGeometry.resolveTokenCell(token)
                val tc = Offset((pos.col + 0.5f) * cell, (pos.row + 0.5f) * cell)

                if (token.id in movableMap || token.id in shieldCandidates) {
                    drawCircle(
                        color = if (token.id in shieldCandidates) Color(0xFF0284C7) else Color(0xFFC98A14),
                        radius = cell * 0.47f,
                        center = tc,
                        style = Stroke(width = 5f)
                    )
                }

                // Soft shadow + raised 3D base skirt + radial dome + specular highlight
                drawCircle(color = Color(0x55241205), radius = cell * 0.35f, center = tc + Offset(2f, 6f))
                drawCircle(color = Color(token.ownerColor.darkHex), radius = cell * 0.34f, center = tc + Offset(0f, 3f))
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            Color(token.ownerColor.highlightHex),
                            Color(token.ownerColor.primaryHex),
                            Color(token.ownerColor.darkHex)
                        ),
                        center = tc - Offset(cell * 0.1f, cell * 0.1f),
                        radius = cell * 0.38f
                    ),
                    radius = cell * 0.33f,
                    center = tc
                )
                drawCircle(color = Color(0xFFFCF5E3), radius = cell * 0.21f, center = tc, style = Stroke(width = 2.5f))
                drawCircle(color = Color.White.copy(alpha = 0.5f), radius = cell * 0.08f, center = tc - Offset(cell * 0.1f, cell * 0.1f))
            }
        }

        // Physical 3D Bouncing Center Dice Simulation
        val t = rollProgress.value
        val bounceLift = if (t < 1f) kotlin.math.abs(kotlin.math.sin(t * Math.PI * 3)).toFloat() * (1f - t) else 0f
        Box(
            modifier = Modifier
                .size(44.dp)
                .graphicsLayer {
                    val scaleFactor = 1f + bounceLift * 0.45f
                    scaleX = scaleFactor
                    scaleY = scaleFactor
                    rotationX = (1f - t) * 720f
                    rotationY = (1f - t) * 540f
                    rotationZ = (1f - t) * 360f
                    translationY = -bounceLift * 90f
                }
                .shadow((4 + bounceLift * 14).dp, RoundedCornerShape(8.dp))
                .border(2.dp, Color(0xFF8C6223), RoundedCornerShape(8.dp))
        )
    }
}
