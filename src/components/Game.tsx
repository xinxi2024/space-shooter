import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
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
  createdAt: number;
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
    reasons: {
      health: string;
      collision: string;
      invasion: string;
    };
  };
}

const languages: { en: Language; zh: Language } = {
  en: {
    title: "Space Shooter",
    start: "Start Game",
    controls: {
      move: "Use ← → keys to move",
      shoot: "Auto-shooting enabled",
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
      reasons: {
        health: "Your ship was destroyed!",
        collision: "Crashed into enemy!",
        invasion: "Enemies reached Earth!"
      }
    },
  },
  zh: {
    title: "太空战机",
    start: "开始游戏",
    controls: {
      move: "使用 ← → 键移动飞船",
      shoot: "自动射击已启用",
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
      reasons: {
        health: "飞船被摧毁了！",
        collision: "撞上敌机！",
        invasion: "敌人入侵地球！"
      }
    },
  },
};

const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 1. 添加游戏结束原因类型
type GameOverReason = 'health' | 'collision' | 'invasion' | null;

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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [lastEnemySpawn, setLastEnemySpawn] = useState(0);
  const [enemySpawnRate, setEnemySpawnRate] = useState(1000);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [activeEffects, setActiveEffects] = useState<{
    shield: boolean;
    damage: number;
    speed: number;
  }>({
    shield: false,
    damage: 0,
    speed: 0,
  });
  const [isHurt, setIsHurt] = useState(false);
  // 2. 添加状态来存储游戏结束原因
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>(null);

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
  }, [gameState, playerStats.speed]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (gameState !== 'playing') return;
    
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    
    // 开始连续射击
    setIsShooting(true);
  }, [gameState]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (gameState !== 'playing') return;
    
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    
    setPlayerPosition(prev => ({
      ...prev,
      x: Math.max(0, Math.min(90, x))
    }));
  }, [gameState]);

  const handleTouchEnd = useCallback(() => {
    setTouchStartX(null);
    setIsShooting(false);
  }, []);

  const debouncedTouchMove = useMemo(
    () => debounce((e: TouchEvent) => {
      if (gameState !== 'playing') return;
      
      const touch = e.touches[0];
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 100;
      
      setPlayerPosition(prev => ({
        ...prev,
        x: Math.max(0, Math.min(90, x))
      }));
    }, 16), // 约60fps
    [gameState]
  );

  useEffect(() => {
    window.addEventListener('keydown', movePlayer);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchmove', debouncedTouchMove);
    
    return () => {
      window.removeEventListener('keydown', movePlayer);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchmove', debouncedTouchMove);
    };
  }, [movePlayer, handleTouchStart, handleTouchMove, handleTouchEnd, debouncedTouchMove]);

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
        }).filter(bullet => {
          const now = Date.now();
          return (
            bullet.y < 100 && 
            bullet.y > 0 && 
            bullet.x >= 0 && 
            bullet.x <= 100 && 
            now - bullet.createdAt <= 3000
          );
        })
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
          if (Math.random() < 0.01 && enemy.y > 0 && enemy.y < 70) {
            const bulletBase = {
              id: generateBulletId(),
              x: enemy.x,
              y: enemy.y + 5,
              createdAt: Date.now(),
            };

            switch (enemy.bulletPattern) {
              case 'straight':
                setEnemyBullets(bullets => [...bullets.slice(-50), {
                  ...bulletBase,
                  type: 'normal',
                  damage: 1,
                }]);
                break;
              case 'spread':
                [-1, 0, 1].forEach((offset, index) => {
                  setTimeout(() => {
                    setEnemyBullets(bullets => [...bullets.slice(-50), {
                      ...bulletBase,
                      id: generateBulletId(),
                      x: enemy.x + offset * 5,
                      type: 'normal',
                      damage: 1,
                    }]);
                  }, index * 50);
                });
                break;
              case 'explosive':
                setEnemyBullets(bullets => [...bullets.slice(-50), {
                  ...bulletBase,
                  type: 'explosive',
                  damage: 2,
                }]);
                break;
              case 'homing':
                setEnemyBullets(bullets => [...bullets.slice(-50), {
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
        return newEnemies.filter(enemy => enemy.y < 100 && enemy.y > -20);
      });

      // Spawn enemies
      const now = Date.now();
      if (now - lastEnemySpawn >= enemySpawnRate) {
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
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        setLastEnemySpawn(now);
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
                handleGameOver('health');
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
          handleGameOver('invasion');
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [enemyId, gameState, level, playerPosition.x, playerPosition.y, lastEnemySpawn, enemySpawnRate]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const shootingInterval = setInterval(() => {
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
    }, 50);
    
    return () => clearInterval(shootingInterval);
  }, [gameState, lastShot, bulletId, playerPosition.x, playerPosition.y, playerStats]);

  // 1. 先声明 handleGameOver 函数
  const handleGameOver = useCallback((reason: GameOverReason) => {
    setGameState('gameover');
    setGameOverReason(reason);
    // 清理所有游戏对象
    setEnemies([]);
    setEnemyBullets([]);
    setBullets([]);
    setPowerUps([]);
  }, []);

  // 2. 然后是 handlePlayerHit 函数
  const handlePlayerHit = useCallback((damage: number) => {
    setIsHurt(true);
    setPlayerStats(prev => ({
      ...prev,
      health: prev.health - damage
    }));
    
    setTimeout(() => setIsHurt(false), 200);
    
    if (playerStats.health <= damage) {
      handleGameOver('health');
    }
  }, [playerStats.health, handleGameOver]);

  // 3. 碰撞检测函数
  const checkPlayerCollision = useCallback((bullet: EnemyBullet) => {
    if (activeEffects.shield) return false;
    
    const playerRect = {
      left: playerPosition.x - 3,
      right: playerPosition.x + 3,
      top: playerPosition.y - 3,
      bottom: playerPosition.y + 3
    };
    
    const bulletRect = {
      left: bullet.x - 0.5,
      right: bullet.x + 0.5,
      top: bullet.y - 1.5,
      bottom: bullet.y + 1.5
    };
    
    return !(
      bulletRect.right < playerRect.left ||
      bulletRect.left > playerRect.right ||
      bulletRect.bottom < playerRect.top ||
      bulletRect.top > playerRect.bottom
    );
  }, [playerPosition.x, playerPosition.y, activeEffects.shield]);

  // 4. 修改游戏循环中的碰撞检测
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      // 检测玩家是否被击中
      setEnemyBullets(prev => {
        const remainingBullets = prev.filter(bullet => {
          const hit = checkPlayerCollision(bullet);
          if (hit) {
            handlePlayerHit(bullet.damage);
            return false;
          }
          return true;
        });
        return remainingBullets;
      });

      // 检测敌人碰撞
      setEnemies(prev => {
        const remainingEnemies = prev.filter(enemy => {
          const collision = Math.abs(enemy.x - playerPosition.x) < 5 && 
                          Math.abs(enemy.y - playerPosition.y) < 5;
          if (collision) {
            handlePlayerHit(2);
            handleGameOver('collision');
            return false;
          }
          return true;
        });
        return remainingEnemies;
      });

      // 检测敌人入侵
      setEnemies(prev => {
        if (prev.some(enemy => enemy.y > 80)) {
          handleGameOver('invasion');
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, checkPlayerCollision, handlePlayerHit, handleGameOver]);

  // 5. 修改 startGame 函数
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setPoints(0);
    setBullets([]);
    setEnemies([]);
    setEnemyBullets([]);
    setPowerUps([]);
    setGameOverReason(null);
    setPlayerPosition({ x: 50, y: 80 });
    setPlayerStats({
      fireRate: 500,
      damage: 1,
      speed: 5,
      health: 10,
      maxHealth: 10,
    });
    setLastShot(0);
    setLastEnemySpawn(0);
    setBulletId(0);
    setEnemyId(0);
  }, []);

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
      case 'scout': 
        return (
          <div className="relative">
            <Star className="text-red-500 animate-pulse absolute" size={24} />
            <Star className="text-yellow-400 animate-pulse opacity-75" size={24} />
          </div>
        );
      case 'speeder':
        return (
          <div className="relative">
            <Ghost className="text-violet-600 animate-bounce absolute" size={24} />
            <Ghost className="text-purple-400 animate-bounce opacity-75" size={24} />
          </div>
        );
      case 'boss':
        return (
          <div className="relative">
            <Skull className="text-yellow-600 animate-pulse absolute" size={32} />
            <Skull className="text-orange-400 animate-pulse opacity-75" size={32} />
          </div>
        );
      case 'bomber':
        return (
          <div className="relative">
            <Bomb className="text-orange-600 animate-bounce absolute" size={28} />
            <Bomb className="text-red-400 animate-bounce opacity-75" size={28} />
          </div>
        );
      case 'elite':
        return (
          <div className="relative">
            <Crown className="text-cyan-500 animate-pulse absolute" size={28} />
            <Crown className="text-blue-400 animate-pulse opacity-75" size={28} />
          </div>
        );
    }
  };

  const MemoizedEnemy = memo(({ enemy }: { enemy: Enemy }) => (
    <div
      className={`absolute ${
        enemy.type === 'scout' ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
        enemy.type === 'speeder' ? 'drop-shadow-[0_0_10px_rgba(147,51,234,0.5)]' :
        enemy.type === 'boss' ? 'drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
        enemy.type === 'bomber' ? 'drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]' :
        'drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]'
      }`}
      style={{
        left: `${enemy.x}%`,
        top: `${enemy.y}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {getEnemyIcon(enemy.type)}
      {enemy.health > 1 && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            <div className="px-2 py-0.5 bg-gray-900/90 rounded text-xs font-bold" style={{
              color: enemy.type === 'scout' ? '#ef4444' :
                     enemy.type === 'speeder' ? '#a855f7' :
                     enemy.type === 'boss' ? '#eab308' :
                     enemy.type === 'bomber' ? '#f97316' :
                     '#3b82f6'
            }}>
              {enemy.health}
            </div>
            <div className="absolute inset-0 animate-ping opacity-50 px-2 py-0.5 bg-gray-900/50 rounded" />
          </div>
        </div>
      )}
    </div>
  ));

  const MemoizedBullet = memo(({ bullet }: { bullet: Bullet }) => (
    <div
      className="absolute w-1 h-3 bg-yellow-400"
      style={{
        left: `${bullet.x}%`,
        top: `${bullet.y}%`,
        transform: 'translate(-50%, -50%)'
      }}
    />
  ));

  useEffect(() => {
    if (gameState !== 'playing') return;

    const powerUpInterval = setInterval(() => {
      if (Math.random() < 0.05) { // 5% 概率生成道具
        const types: PowerUp['type'][] = ['health', 'damage', 'speed', 'shield', 'bomb'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        setPowerUps(prev => [...prev, {
          id: `powerup-${Date.now()}-${Math.random()}`,
          type: randomType,
          x: Math.random() * 90,
          y: -10,
          duration: randomType === 'shield' ? 10000 : // 护盾持续10秒
                   randomType === 'damage' ? 8000 : // 伤害加成持续8秒
                   randomType === 'speed' ? 5000 : // 速度加成持续5秒
                   undefined // health 和 bomb 是即时效果
        }]);
      }
    }, 2000);

    return () => clearInterval(powerUpInterval);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const powerUpLoop = setInterval(() => {
      setPowerUps(prev => {
        const newPowerUps = prev.map(powerUp => ({
          ...powerUp,
          y: powerUp.y + 1
        })).filter(powerUp => powerUp.y < 100);

        // 检测与玩家的碰撞
        return newPowerUps.filter(powerUp => {
          const collision = Math.abs(powerUp.x - playerPosition.x) < 5 && 
                          Math.abs(powerUp.y - playerPosition.y) < 5;
          
          if (collision) {
            handlePowerUpCollect(powerUp);
            return false;
          }
          return true;
        });
      });
    }, 50);

    return () => clearInterval(powerUpLoop);
  }, [gameState, playerPosition]);

  const handlePowerUpCollect = (powerUp: PowerUp) => {
    switch (powerUp.type) {
      case 'health':
        setPlayerStats(prev => ({
          ...prev,
          health: Math.min(prev.maxHealth, prev.health + 2)
        }));
        break;
      case 'damage':
        setActiveEffects(prev => ({ ...prev, damage: prev.damage + 1 }));
        setTimeout(() => {
          setActiveEffects(prev => ({ ...prev, damage: Math.max(0, prev.damage - 1) }));
        }, powerUp.duration);
        break;
      case 'speed':
        setActiveEffects(prev => ({ ...prev, speed: prev.speed + 2 }));
        setTimeout(() => {
          setActiveEffects(prev => ({ ...prev, speed: Math.max(0, prev.speed - 2) }));
        }, powerUp.duration);
        break;
      case 'shield':
        setActiveEffects(prev => ({ ...prev, shield: true }));
        setTimeout(() => {
          setActiveEffects(prev => ({ ...prev, shield: false }));
        }, powerUp.duration);
        break;
      case 'bomb':
        // 清除屏幕上所有敌人和子弹
        setEnemies([]);
        setEnemyBullets([]);
        break;
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-[fadeIn_0.5s_ease-in-out]">
          <div className="text-red-500 text-4xl mb-4 animate-[bounceIn_0.5s_ease-in-out]">
            {t.gameOver.title}
          </div>
          {gameOverReason && (
            <div className="text-yellow-500 text-xl mb-6 animate-[bounceIn_0.5s_ease-in-out_0.1s]">
              {t.gameOver.reasons[gameOverReason]}
            </div>
          )}
          <div className="text-white text-2xl mb-4 animate-[slideIn_0.5s_ease-in-out_0.2s]">
            {t.gameOver.finalScore}: {score}
          </div>
          <div className="text-white text-xl mb-8 animate-[slideIn_0.5s_ease-in-out_0.4s]">
            {t.gameOver.level}: {level}
          </div>
          <button
            onClick={() => {
              setGameOverReason(null);
              startGame();
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                      transition transform hover:scale-105 animate-[fadeIn_0.5s_ease-in-out_0.6s]"
          >
            {t.gameOver.restart}
          </button>
        </div>
      ) : (
        <>
          <div
            className={`absolute ${isHurt ? 'animate-[hurt_0.2s_ease-in-out]' : 'animate-pulse'}`}
            style={{
              left: `${playerPosition.x}%`,
              top: `${playerPosition.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <Rocket 
              size={32} 
              className={`${
                isHurt ? 'text-red-500' : 
                activeEffects.shield ? 'text-blue-400' : 
                'text-blue-500'
              }`} 
            />
            {isHurt && (
              <div className="absolute inset-0 animate-ping">
                <Rocket size={32} className="text-red-500 opacity-50" />
              </div>
            )}
          </div>

          {bullets.map(bullet => (
            <MemoizedBullet key={bullet.id} bullet={bullet} />
          ))}

          {enemyBullets.map(bullet => (
            <div
              key={bullet.id}
              className={`absolute w-1.5 h-4 rounded-full ${
                bullet.type === 'normal' ? 'bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.7)]' :
                bullet.type === 'explosive' ? 'bg-gradient-to-b from-orange-500 to-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.7)]' :
                'bg-gradient-to-b from-purple-500 to-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.7)]'
              } ${bullet.type === 'explosive' ? 'animate-ping' : 'animate-pulse'}`}
              style={{
                left: `${bullet.x}%`,
                top: `${bullet.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {enemies.map(enemy => (
            <MemoizedEnemy key={enemy.id} enemy={enemy} />
          ))}

          {powerUps.map(powerUp => (
            <div
              key={powerUp.id}
              className={`absolute w-6 h-6 ${
                powerUp.type === 'health' ? 'text-red-500' :
                powerUp.type === 'damage' ? 'text-yellow-500' :
                powerUp.type === 'speed' ? 'text-green-500' :
                powerUp.type === 'shield' ? 'text-blue-500' :
                'text-purple-500'
              }`}
              style={{
                left: `${powerUp.x}%`,
                top: `${powerUp.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {powerUp.type === 'health' ? <Heart /> :
               powerUp.type === 'damage' ? <Zap /> :
               powerUp.type === 'speed' ? <Wind /> :
               powerUp.type === 'shield' ? <Shield /> :
               <Bomb />}
            </div>
          ))}

          {activeEffects.shield && (
            <div className="absolute w-12 h-12 text-blue-500 opacity-50 animate-pulse"
              style={{
                left: `${playerPosition.x}%`,
                top: `${playerPosition.y}%`,
                transform: 'translate(-50%, -50%)'
              }}>
              <Shield size={48} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 碰撞检测函数优化
const checkCollision = (bullet: Bullet, enemy: Enemy) => {
  const bulletRect = {
    left: bullet.x - 0.5,
    right: bullet.x + 0.5,
    top: bullet.y - 1.5,
    bottom: bullet.y + 1.5
  };
  
  const enemyRect = {
    left: enemy.x - 2,
    right: enemy.x + 2,
    top: enemy.y - 2,
    bottom: enemy.y + 2
  };
  
  return !(
    bulletRect.right < enemyRect.left ||
    bulletRect.left > enemyRect.right ||
    bulletRect.bottom < enemyRect.top ||
    bulletRect.top > enemyRect.bottom
  );
};

const generateBulletId = () => {
  return `bullet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};