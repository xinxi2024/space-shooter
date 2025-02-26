import React, { useState, useEffect, useCallback } from 'react';
import { Rocket, Star, Zap, Shield, Target, Skull, Ghost, Bomb, Crown, Heart } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface Bullet extends Position {
  id: number;
  damage: number;
}

interface Enemy extends Position {
  id: number;
  health: number;
  type: 'scout' | 'speeder' | 'boss' | 'bomber' | 'elite';
  bulletPattern: 'straight' | 'spread' | 'homing' | 'explosive';
}

interface EnemyBullet extends Position {
  id: number;
  type: 'normal' | 'explosive' | 'homing';
  damage: number;
}

interface PlayerStats {
  fireRate: number;
  damage: number;
  speed: number;
  health: number;
  maxHealth: number;
}

interface Language {
  title: string;
  start: string;
  controls: {
    move: string;
    shoot: string;
    upgrade: string;
  };
  enemies: {
    title: string;
    scout: string;
    speeder: string;
    boss: string;
    bomber: string;
    elite: string;
  };
  stats: {
    score: string;
    level: string;
    points: string;
    health: string;
  };
  upgrades: {
    title: string;
    fireRate: string;
    damage: string;
    speed: string;
    health: string;
  };
  gameOver: {
    title: string;
    finalScore: string;
    level: string;
    restart: string;
  };
}

const languages: { en: Language; zh: Language } = {
  en: {
    title: "Space Shooter",
    start: "Start Game",
    controls: {
      move: "Use ← → keys to move",
      shoot: "Press Space to shoot",
      upgrade: "Use points to upgrade",
    },
    enemies: {
      title: "Enemy Types:",
      scout: "Scout",
      speeder: "Speeder",
      boss: "Boss",
      bomber: "Bomber",
      elite: "Elite",
    },
    stats: {
      score: "Score",
      level: "Level",
      points: "Upgrade Points",
      health: "Health",
    },
    upgrades: {
      title: "Ship Upgrades",
      fireRate: "Fire Rate",
      damage: "Damage",
      speed: "Speed",
      health: "Health",
    },
    gameOver: {
      title: "Game Over!",
      finalScore: "Final Score",
      level: "Level Reached",
      restart: "Play Again",
    },
  },
  zh: {
    title: "太空战机",
    start: "开始游戏",
    controls: {
      move: "使用 ← → 键移动飞船",
      shoot: "按空格键发射子弹",
      upgrade: "使用升级点数强化飞船",
    },
    enemies: {
      title: "敌人类型：",
      scout: "侦察机",
      speeder: "快速机",
      boss: "首领",
      bomber: "轰炸机",
      elite: "精英",
    },
    stats: {
      score: "得分",
      level: "关卡",
      points: "升级点数",
      health: "血量",
    },
    upgrades: {
      title: "飞船升级",
      fireRate: "射速",
      damage: "伤害",
      speed: "速度",
      health: "血量",
    },
    gameOver: {
      title: "游戏结束!",
      finalScore: "最终得分",
      level: "到达关卡",
      restart: "再来一局",
    },
  },
};

export default function Game() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const t = languages[lang];
  
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 50, y: 80 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<EnemyBullet[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [bulletId, setBulletId] = useState(0);
  const [enemyId, setEnemyId] = useState(0);
  const [lastShot, setLastShot] = useState(0);
  const [points, setPoints] = useState(0);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    fireRate: 500,
    damage: 1,
    speed: 5,
    health: 10,
    maxHealth: 10,
  });

  const movePlayer = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    if (e.key === 'l') {
      setLang(prev => prev === 'en' ? 'zh' : 'en');
      return;
    }
    
    setPlayerPosition(prev => {
      let newX = prev.x;
      
      if (e.key === 'ArrowLeft') newX = Math.max(0, prev.x - playerStats.speed);
      if (e.key === 'ArrowRight') newX = Math.min(90, prev.x + playerStats.speed);
      
      return { ...prev, x: newX };
    });

    if (e.code === 'Space') {
      const now = Date.now();
      if (now - lastShot >= playerStats.fireRate) {
        setBullets(prev => [...prev, { 
          id: bulletId, 
          x: playerPosition.x + 2, 
          y: playerPosition.y,
          damage: playerStats.damage
        }]);
        setBulletId(prev => prev + 1);
        setLastShot(now);
      }
    }
  }, [bulletId, gameState, lastShot, playerPosition.x, playerPosition.y, playerStats]);

  useEffect(() => {
    window.addEventListener('keydown', movePlayer);
    return () => window.removeEventListener('keydown', movePlayer);
  }, [movePlayer]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // Move bullets
      setBullets(prev => 
        prev
          .map(bullet => ({ ...bullet, y: bullet.y - 2 }))
          .filter(bullet => bullet.y > 0)
      );

      // Move enemy bullets
      setEnemyBullets(prev =>
        prev.map(bullet => {
          let newX = bullet.x;
          let newY = bullet.y + 1.5;

          if (bullet.type === 'homing') {
            const dx = playerPosition.x - bullet.x;
            const dy = playerPosition.y - bullet.y;
            const angle = Math.atan2(dy, dx);
            newX += Math.cos(angle) * 1;
            newY += Math.sin(angle) * 1;
          }

          return { ...bullet, x: newX, y: newY };
        }).filter(bullet => bullet.y < 100)
      );

      // Move enemies and handle enemy shooting
      setEnemies(prev => {
        const newEnemies = prev.map(enemy => {
          let ySpeed = 0.3 + level * 0.05;
          let xSpeed = 0;

          switch (enemy.type) {
            case 'speeder':
              ySpeed *= 1.5;
              break;
            case 'boss':
              ySpeed *= 0.5;
              break;
            case 'bomber':
              ySpeed *= 0.7;
              xSpeed = Math.sin(Date.now() / 1000) * 0.5;
              break;
            case 'elite':
              ySpeed *= 0.8;
              xSpeed = Math.cos(Date.now() / 800) * 0.8;
              break;
          }

          // Enemy shooting
          if (Math.random() < 0.02) {
            const bulletBase = {
              id: Math.random(),
              x: enemy.x,
              y: enemy.y + 5,
            };

            switch (enemy.bulletPattern) {
              case 'straight':
                setEnemyBullets(bullets => [...bullets, {
                  ...bulletBase,
                  type: 'normal',
                  damage: 1,
                }]);
                break;
              case 'spread':
                [-1, 0, 1].forEach(offset => {
                  setEnemyBullets(bullets => [...bullets, {
                    ...bulletBase,
                    x: enemy.x + offset * 5,
                    type: 'normal',
                    damage: 1,
                  }]);
                });
                break;
              case 'explosive':
                setEnemyBullets(bullets => [...bullets, {
                  ...bulletBase,
                  type: 'explosive',
                  damage: 2,
                }]);
                break;
              case 'homing':
                setEnemyBullets(bullets => [...bullets, {
                  ...bulletBase,
                  type: 'homing',
                  damage: 1,
                }]);
                break;
            }
          }

          return {
            ...enemy,
            x: Math.max(0, Math.min(90, enemy.x + xSpeed)),
            y: enemy.y + ySpeed,
          };
        });
        return newEnemies.filter(enemy => enemy.y < 100);
      });

      // Spawn enemies
      if (Math.random() < 0.02 + (level * 0.01)) {
        const enemyTypes: Enemy['type'][] = ['scout', 'speeder', 'boss', 'bomber', 'elite'];
        const availableTypes = enemyTypes.slice(0, Math.min(2 + Math.floor(level / 2), enemyTypes.length));
        const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        
        const bulletPatterns: { [key in Enemy['type']]: Enemy['bulletPattern'] } = {
          scout: 'straight',
          speeder: 'straight',
          boss: 'spread',
          bomber: 'explosive',
          elite: 'homing',
        };

        setEnemies(prev => [
          ...prev,
          { 
            id: enemyId, 
            x: Math.random() * 90, 
            y: -10,
            health: randomType === 'scout' ? Math.ceil(level / 2) :
                   randomType === 'speeder' ? Math.ceil(level / 3) :
                   randomType === 'boss' ? Math.ceil(level * 2) :
                   randomType === 'bomber' ? Math.ceil(level * 1.5) :
                   Math.ceil(level * 1.8),
            type: randomType,
            bulletPattern: bulletPatterns[randomType],
          }
        ]);
        setEnemyId(prev => prev + 1);
      }

      // Check collisions between player bullets and enemies
      setBullets(prev => {
        const newBullets = [...prev];
        setEnemies(prevEnemies => {
          const newEnemies = [...prevEnemies];
          
          for (let i = newBullets.length - 1; i >= 0; i--) {
            for (let j = newEnemies.length - 1; j >= 0; j--) {
              const bullet = newBullets[i];
              const enemy = newEnemies[j];
              
              if (Math.abs(bullet.x - enemy.x) < 5 && Math.abs(bullet.y - enemy.y) < 5) {
                newBullets.splice(i, 1);
                enemy.health -= bullet.damage;
                
                if (enemy.health <= 0) {
                  newEnemies.splice(j, 1);
                  const pointsGained = 
                    enemy.type === 'scout' ? 1 :
                    enemy.type === 'speeder' ? 2 :
                    enemy.type === 'boss' ? 5 :
                    enemy.type === 'bomber' ? 3 :
                    4;
                  setScore(s => s + (pointsGained * 10));
                  setPoints(p => p + pointsGained);
                }
                break;
              }
            }
          }
          
          return newEnemies;
        });
        
        return newBullets;
      });

      // Check collisions between enemy bullets and player
      setEnemyBullets(prev => {
        const newEnemyBullets = [...prev];
        for (let i = newEnemyBullets.length - 1; i >= 0; i--) {
          const bullet = newEnemyBullets[i];
          if (Math.abs(bullet.x - playerPosition.x) < 5 && Math.abs(bullet.y - playerPosition.y) < 5) {
            newEnemyBullets.splice(i, 1);
            setPlayerStats(prev => {
              const newHealth = prev.health - bullet.damage;
              if (newHealth <= 0) {
                setGameState('gameover');
              }
              return { ...prev, health: Math.max(0, newHealth) };
            });
          }
        }
        return newEnemyBullets;
      });

      // Check level up
      if (score > 0 && score >= level * 100) {
        setLevel(l => l + 1);
      }

      // Check game over from enemies reaching bottom
      setEnemies(prev => {
        if (prev.some(enemy => enemy.y > 80)) {
          setGameState('gameover');
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [enemyId, gameState, level, playerPosition.x, playerPosition.y]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setPoints(0);
    setBullets([]);
    setEnemies([]);
    setEnemyBullets([]);
    setPlayerPosition({ x: 50, y: 80 });
    setPlayerStats({
      fireRate: 500,
      damage: 1,
      speed: 5,
      health: 10,
      maxHealth: 10,
    });
  };

  const upgrade = (stat: keyof PlayerStats) => {
    if (points < 1) return;
    
    setPoints(p => p - 1);
    setPlayerStats(prev => ({
      ...prev,
      [stat]: stat === 'fireRate' 
        ? Math.max(100, prev.fireRate - 50)
        : stat === 'health'
        ? { ...prev, health: prev.health + 2, maxHealth: prev.maxHealth + 2 }[stat]
        : prev[stat] + 1
    }));
  };

  const getEnemyIcon = (type: Enemy['type']) => {
    switch (type) {
      case 'scout': return <Star className="animate-pulse" size={24} />;
      case 'speeder': return <Ghost className="animate-bounce" size={24} />;
      case 'boss': return <Skull className="animate-pulse" size={32} />;
      case 'bomber': return <Bomb className="animate-bounce" size={28} />;
      case 'elite': return <Crown className="animate-pulse" size={28} />;
    }
  };

  if (gameState === 'start') {
    return (
      <div className="relative w-full h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-black flex items-center justify-center">
        <button
          onClick={() => setLang(prev => prev === 'en' ? 'zh' : 'en')}
          className="absolute top-4 right-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          {lang === 'en' ? '中文' : 'English'}
        </button>
        <div className="text-center">
          <h1 className="text-6xl font-bold text-blue-500 mb-8">{t.title}</h1>
          <div className="text-white text-xl mb-8 space-y-2">
            <p>{t.controls.move}</p>
            <p>{t.controls.shoot}</p>
            <p>{t.controls.upgrade}</p>
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <p className="text-yellow-400 mb-2">{t.enemies.title}</p>
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center">
                  <Star className="text-red-500 mr-2" />
                  <span>{t.enemies.scout}</span>
                </div>
                <div className="flex items-center">
                  <Ghost className="text-purple-500 mr-2" />
                  <span>{t.enemies.speeder}</span>
                </div>
                <div className="flex items-center">
                  <Skull className="text-yellow-500 mr-2" />
                  <span>{t.enemies.boss}</span>
                </div>
                <div className="flex items-center">
                  <Bomb className="text-orange-500 mr-2" />
                  <span>{t.enemies.bomber}</span>
                </div>
                <div className="flex items-center">
                  <Crown className="text-blue-500 mr-2" />
                  <span>{t.enemies.elite}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-4 bg-blue-500 text-white text-2xl rounded-lg hover:bg-blue-600 transition transform hover:scale-105"
          >
            {t.start}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-black overflow-hidden">
      <div className="absolute top-4 left-4 text-white space-y-2 bg-gray-800/50 p-4 rounded-lg backdrop-blur-sm">
        <div className="text-xl">{t.stats.score}: {score}</div>
        <div className="text-xl">{t.stats.level}: {level}</div>
        <div className="text-xl">{t.stats.points}: {points}</div>
        <div className="text-xl flex items-center gap-2">
          {t.stats.health}: 
          <div className="flex">
            {Array.from({ length: playerStats.maxHealth }).map((_, i) => (
              <Heart
                key={i}
                size={16}
                className={i < playerStats.health ? 'text-red-500' : 'text-gray-500'}
                fill={i < playerStats.health ? '#ef4444' : 'none'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade Panel */}
      <div className="absolute top-4 right-4 bg-gray-800/50 p-4 rounded-lg backdrop-blur-sm">
        <div className="text-white mb-4 font-bold">{t.upgrades.title}</div>
        <div className="space-y-2">
          <button
            onClick={() => upgrade('fireRate')}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded w-full hover:bg-blue-600 disabled:opacity-50 transition"
            disabled={points < 1}
          >
            <Zap className="mr-2" size={16} />
            {t.upgrades.fireRate} ({Math.floor((1000 / playerStats.fireRate) * 100) / 100}/s)
          </button>
          <button
            onClick={() => upgrade('damage')}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded w-full hover:bg-red-600 disabled:opacity-50 transition"
            disabled={points < 1}
          >
            <Target className="mr-2" size={16} />
            {t.upgrades.damage} ({playerStats.damage})
          </button>
          <button
            onClick={() => upgrade('speed')}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded w-full hover:bg-green-600 disabled:opacity-50 transition"
            disabled={points < 1}
          >
            <Shield className="mr-2" size={16} />
            {t.upgrades.speed} ({playerStats.speed})
          </button>
          <button
            onClick={() => upgrade('health')}
            className="flex items-center px-4 py-2 bg-purple-500 text-white rounded w-full hover:bg-purple-600 disabled:opacity-50 transition"
            disabled={points < 1}
          >
            <Heart className="mr-2" size={16} />
            {t.upgrades.health} ({playerStats.maxHealth})
          </button>
        </div>
      </div>
      
      {gameState === 'gameover' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-red-500 text-4xl mb-4">{t.gameOver.title}</div>
          <div className="text-white text-2xl mb-4">{t.gameOver.finalScore}: {score}</div>
          <div className="text-white text-xl mb-8">{t.gameOver.level}: {level}</div>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition transform hover:scale-105"
          >
            {t.gameOver.restart}
          </button>
        </div>
      ) : (
        <>
          <div
            className="absolute text-blue-500"
            style={{
              left: `${playerPosition.x}%`,
              top: `${playerPosition.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <Rocket size={32} className="animate-pulse" />
          </div>

          {bullets.map(bullet => (
            <div
              key={bullet.id}
              className="absolute w-1 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 animate-pulse"
              style={{
                left: `${bullet.x}%`,
                top: `${bullet.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {enemyBullets.map(bullet => (
            <div
              key={bullet.id}
              className={`absolute w-1 h-3 rounded-full shadow-lg ${
                bullet.type === 'normal' ? 'bg-red-400 shadow-red-400/50' :
                bullet.type === 'explosive' ? 'bg-orange-400 shadow-orange-400/50' :
                'bg-purple-400 shadow-purple-400/50'
              } ${bullet.type === 'explosive' ? 'animate-ping' : 'animate-pulse'}`}
              style={{
                left: `${bullet.x}%`,
                top: `${bullet.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {enemies.map(enemy => (
            <div
              key={enemy.id}
              className={`absolute ${
                enemy.type === 'scout' ? 'text-red-500' :
                enemy.type === 'speeder' ? 'text-purple-500' :
                enemy.type === 'boss' ? 'text-yellow-500' :
                enemy.type === 'bomber' ? 'text-orange-500' :
                'text-blue-500'
              }`}
              style={{
                left: `${enemy.x}%`,
                top: `${enemy.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {getEnemyIcon(enemy.type)}
              {enemy.health > 1 && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs text-white bg-gray-800/70 px-1 rounded">
                  {enemy.health}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}