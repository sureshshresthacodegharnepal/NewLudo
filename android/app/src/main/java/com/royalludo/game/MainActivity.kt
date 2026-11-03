package com.royalludo.game

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.royalludo.game.data.StatsPreferencesRepository
import com.royalludo.game.model.*
import com.royalludo.game.ui.components.LudoBoardCanvas
import com.royalludo.game.viewmodel.LudoViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repository = StatsPreferencesRepository(applicationContext)
        val viewModel = LudoViewModel(repository)

        setContent {
            MaterialTheme {
                LudoAppNavHost(viewModel = viewModel)
            }
        }
    }
}

private val MapleWoodBrush = Brush.verticalGradient(
    colors = listOf(Color(0xFFE7CB9F), Color(0xFFDAB682), Color(0xFFCFA66D))
)

private val GoldButtonBrush = Brush.verticalGradient(
    colors = listOf(Color(0xFFFFF3B0), Color(0xFFF1C24B), Color(0xFFC98C1C))
)

@Composable
fun LudoAppNavHost(viewModel: LudoViewModel) {
    val navController = rememberNavController()
    val gameState by viewModel.gameState.collectAsStateWithLifecycle()
    val stats by viewModel.careerStats.collectAsStateWithLifecycle()
    val sfxEnabled by viewModel.sfxEnabled.collectAsStateWithLifecycle()

    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MapleWoodBrush)
                    .padding(24.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "ROYAL LUDO",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF2C1A0E)
                )
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = { navController.navigate("setup") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD99B26)),
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Play Game", color = Color(0xFF2C1A0E), fontWeight = FontWeight.Bold)
                    }
                    Text(
                        text = "Games: ${stats.totalGamesPlayed} · Wins: ${stats.gamesWon} (${stats.winPercentage}%) · Streak: ${stats.bestWinStreak}",
                        color = Color(0xFF4A2C14),
                        fontSize = 13.sp
                    )
                }
            }
        }

        composable("setup") {
            var playerCount by remember { mutableIntStateOf(4) }
            var vsComputer by remember { mutableStateOf(true) }
            var difficulty by remember { mutableStateOf(AiDifficulty.MEDIUM) }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MapleWoodBrush)
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text("Match Setup", fontSize = 26.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2C1A0E))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(2, 3, 4).forEach { count ->
                        FilterChip(
                            selected = playerCount == count,
                            onClick = { playerCount = count },
                            label = { Text("$count Players") }
                        )
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = vsComputer, onCheckedChange = { vsComputer = it })
                    Text("Play vs Computer AI", color = Color(0xFF2C1A0E))
                }
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = {
                        val colors = if (playerCount == 2) {
                            listOf(PlayerColor.BLUE, PlayerColor.GREEN)
                        } else {
                            PlayerColor.entries.take(playerCount)
                        }
                        val roster = colors.mapIndexed { idx, col ->
                            val type = if (vsComputer && idx > 0) PlayerType.AI else PlayerType.HUMAN
                            Triple(if (type == PlayerType.AI) "Bot ${col.label}" else "Player ${idx + 1}", col, type)
                        }
                        viewModel.startNewMatch(roster, difficulty, GameRulesConfig())
                        navController.navigate("play")
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD99B26)),
                    modifier = Modifier.fillMaxWidth().height(54.dp)
                ) {
                    Text("Start Game", color = Color(0xFF2C1A0E), fontWeight = FontWeight.Bold)
                }
            }
        }

        composable("play") {
            LaunchedEffect(gameState.turnPhase) {
                if (gameState.turnPhase == TurnPhase.GAME_OVER) {
                    navController.navigate("result")
                }
            }
            val active = gameState.players.getOrNull(gameState.currentPlayerIndex)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MapleWoodBrush)
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Top Walnut Turn Banner
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF4A2B12), RoundedCornerShape(16.dp))
                        .border(2.dp, Color(0xFFCAA052), RoundedCornerShape(16.dp))
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "${active?.name ?: ""}’s Turn · Roll: ${gameState.lastDiceRoll?.total ?: "-"}",
                        color = Color(0xFFFDF8EC),
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp
                    )
                }

                // Center Symmetrical Wooden Ludo Board
                LudoBoardCanvas(
                    gameState = gameState,
                    onRollCenterDice = viewModel::onRollDiceClicked,
                    onSelectMove = viewModel::onSelectTokenMove,
                    onSelectShieldToken = viewModel::onApplyShieldToToken
                )

                // Bottom Golden Circular Controls
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = { navController.popBackStack("home", inclusive = false) },
                        modifier = Modifier
                            .size(52.dp)
                            .background(GoldButtonBrush, CircleShape)
                            .border(2.dp, Color(0xFF5C3906), CircleShape)
                    ) {
                        Text("←", fontWeight = FontWeight.Bold, color = Color(0xFF382005))
                    }
                    IconButton(
                        onClick = viewModel::onRollDiceClicked,
                        enabled = active?.type == PlayerType.HUMAN && gameState.turnPhase == TurnPhase.WAITING_FOR_ROLL,
                        modifier = Modifier
                            .size(66.dp)
                            .background(GoldButtonBrush, CircleShape)
                            .border(2.5.dp, Color(0xFF5C3906), CircleShape)
                    ) {
                        Text("ROLL", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = Color(0xFF382005))
                    }
                    IconButton(
                        onClick = { viewModel.toggleSfx(!sfxEnabled) },
                        modifier = Modifier
                            .size(52.dp)
                            .background(GoldButtonBrush, CircleShape)
                            .border(2.dp, Color(0xFF5C3906), CircleShape)
                    ) {
                        Text(if (sfxEnabled) "SFX" else "MUTE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF382005))
                    }
                }
            }
        }

        composable("result") {
            val winner = gameState.players.firstOrNull { it.color == gameState.winnerColor }
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MapleWoodBrush)
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("${winner?.name ?: "Player"} Wins!", fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF2C1A0E))
                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = { navController.popBackStack("home", inclusive = false) },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD99B26))
                ) {
                    Text("Return to Home", color = Color(0xFF2C1A0E), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
