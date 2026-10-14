# Components (generated)

Generated from the component schemas by `npm run check`. Do not edit.

## AmbientSound

Positional looping or periodic sound (hums, drips, machinery).

```
sound     sound id = "" — Sound id
volume    number = 1 [0..4]
interval  number = 0 [0..] s — 0 = loop forever; >0 = replay every interval
jitter    number = 0.3 [0..1] — Random interval variation (fraction)
on        boolean = true
voice     integer = 0 — State: playing loop voice id (0 = none)
next      number = 0 — State: sim time of the next periodic play
```

## Animator

Plays clips (by id or puppet role) on the Model puppet, with crossfades.

```
play      string = "idle" — Clip id or puppet clip role
speed     number = 1 [0..] — Playback rate
fade      number = 0.2 [0..] s — Crossfade time when play changes
time      number = 0 — State: seconds into the current clip
current   string = "" — State: clip id now playing
prev      string = "" — State: clip id fading out
prevTime  number = 0 — State: seconds into the fading clip
blend     number = 1 — State: weight of the current clip (0..1)
```

## AreaPulse

Delayed, telegraphed area damage for spells, bosses and environmental reactions.

```
radius     number = 4 [0.1..]
delay      number = 0.8 [0..]
damage     number = 40 [0..]
owner      integer = -1
targetTag  string = "enemy"
element    "kinetic"|"fire"|"frost"|"shock" = "kinetic"
effect     effect id = "explosion"
age        number = 0 — State
```

## Arsenal

Owned weapons, current selection, magazine counts, cooldown and reload state.

```
weapons    string[] = [] — Weapon prefab ids owned
current    integer = -1 — Index into weapons (-1 = none)
mags       object = {} — State: rounds loaded per weapon
cooldown   number = 0 — State: seconds until the next shot
reloading  number = 0 — State: seconds of reload left
switching  number = 0 — State: seconds of weapon raise left
shots      integer = 0 — State: total shots fired
```

## Body

Rigid body + collider (static, dynamic, or kinematic). Origin at shape bottom by default.

```
type            "static"|"dynamic"|"kinematic" = "static" — kinematic follows Transform
shape           "box"|"sphere"|"capsule"|"cylinder"|"cone"|"wedge" = "box" — wedge = ramp rising toward -Z (matches the wedge model part)
size            n | [x,y,z] = [1,1,1] m — Full size in meters. sphere: x = diameter. capsule/cylinder/cone: x = diameter, y = height
offset          n | [x,y,z] = [0,0,0] m — Extra local offset of the shape
pivot           "bottom"|"center" = "bottom" — Where the entity origin sits on the shape
layer           "world"|"prop"|"player"|"enemy"|"pickup"|"trigger"|"debris"|"projectile" = "world"
sensor          boolean = false — Overlap-only: emits TriggerEntered/TriggerExited, blocks nothing
mass            number = 0 [0..] kg — 0 = density 1 (water) times volume
friction        number = 0.6 [0..]
restitution     number = 0.05 [0..1] — Bounciness
linearDamping   number = 0.05 [0..]
angularDamping  number = 0.1 [0..]
gravityScale    number = 1
lockRotation    boolean = false — Prevent tipping over (dynamic only)
ccd             boolean = false — Continuous collision for fast bodies
events          boolean = false — Emit Contact events for this body
```

## Brain

Enemy AI: idle → chase → attack (melee, ranged, turret) with sight checks and pathfinding.

```
style         "melee"|"ranged"|"turret" = "melee"
sight         number = 20 [0..] m
fov           number = 140 [1..360] deg
hearing       number = 6 [0..] m — Notices the player this close, even behind it
speed         number = 3.5 [0..] m/s
turnRate      number = 300 [1..] deg/s
attackRange   number = 1.8 [0.1..] m
attackDamage  number = 10 [0..]
attackRate    number = 1 [0.05..] 1/s
projectile    prefab id = "" — Ranged: projectile prefab (empty = hitscan)
tracer        effect id = "tracer-enemy" — Ranged hitscan visual
aimError      number = 3 [0..] deg
eye           number = 1.5 [0..] m — Eye height above origin
aggressive    boolean = false — Always knows where the player is (wave enemies)
gravity       number = 20 m/s²
alertSound    sound id = "alert"
attackSound   sound id = ""
state         "idle"|"chase"|"attack" = "idle" — State
target        integer = -1 — State: entity being hunted
lastSeen      n | [x,y,z] = 0 — State: where the target was last seen
lastSeenAt    number = -999 — State
cooldown      number = 0 — State: seconds until the next attack
path          any[][] = [] — State: waypoints
repathAt      number = 0 — State
```

## CameraRig

Render camera mount: first/third person, eye offset, pitch, FOV.

```
mode      "first"|"third" = "first"
offset    n | [x,y,z] = [0,1.6,0] m — Eye position relative to the entity origin
pitch     number = 0 [-89..89] deg — State: look up/down
distance  number = 4 [0..] m — Third person: distance behind the eye
fov       number = 75 [20..120] deg
priority  integer = 0 — Highest priority rig drives the camera
```

## CharacterBody

Kinematic capsule character (walls, steps, slopes). Origin at feet.

```
radius      number = 0.35 [0.05..] m
height      number = 1.8 [0.2..] m — Total height including caps
stepHeight  number = 0.5 [0..] m — Max step climbed automatically
maxSlope    number = 50 [0..89] deg
snap        number = 0.3 [0..] m — Snap-to-ground distance when walking down
layer       "world"|"prop"|"player"|"enemy"|"pickup"|"trigger"|"debris"|"projectile" = "player"
pushProps   boolean = true — Shove dynamic bodies when walking into them
velocity    n | [x,y,z] = 0 m/s — State: velocity in m/s, owned by the driving system
grounded    boolean = false — Output: standing on ground after the last move
```

## CombatStats

Composable damage, movement, elemental and on-hit modifiers for any combatant.

```
damage          number = 1 [0..]
incoming        number = 1 [0..]
movement        number = 1 [0..]
critical        number = 0 [0..1]
criticalDamage  number = 1.8 [1..]
element         "kinetic"|"fire"|"frost"|"shock" = "kinetic"
leech           number = 0 [0..1]
chains          integer = 0 [0..8]
detonate        number = 0 [0..] — On-kill explosion as a fraction of target maximum health
```

## Counter

Counts signals; fires onReach at the goal (e.g. "kill 3 enemies opens the door").

```
goal     integer = 3 [1..]
onReach  object[] = []
count    integer = 0 — State
done     boolean = false — State: onReach already ran
```

## Door

Proximity/signal door with optional key; moves via its Mover.

```
key            string = "" — Inventory key needed ("" = unlocked)
auto           boolean = true — Open when a player is within radius
radius         number = 3.5 [0..] m
closeDelay     number = 2 [0..] s — Seconds after everyone leaves; 0 = stays open
openSound      sound id = "door-open"
closeSound     sound id = "door-close"
lockedMessage  string = "Locked. Needs the {key} key."
open           boolean = false — State
lastNear       number = -999 — State: sim time a player was last near
lastNag        number = -999 — State: sim time of the last locked message
```

## ElementState

Timed elemental state shared by weapons, enemies, abilities and environmental fields.

```
burn     number = 0 [0..] — State: burning seconds remaining
chill    number = 0 [0..] — State: chilled seconds remaining
wet      number = 0 [0..] — State: conductive seconds remaining
charged  number = 0 [0..] — State: empowered seconds remaining
source   integer = -1 — State: burn owner
power    number = 0 [0..] — State: burn damage per second, already scaled
pulse    number = 0 — State: burn tick accumulator
```

## Explosive

Explodes on death: splash damage, knockback, effect.

```
radius   number = 4 [0.1..] m
damage   number = 80 [0..]
impulse  number = 10 [0..]
effect   effect id = "explosion"
```

## FpsController

First-person walking, sprinting, crouching, jumping, looking; rides moving platforms.

```
walkSpeed      number = 6.5 [0..] m/s
sprintSpeed    number = 10 [0..] m/s
crouchSpeed    number = 3 [0..] m/s
accel          number = 60 [0..] m/s² — Ground acceleration toward the wished velocity
airAccel       number = 14 [0..] m/s²
jumpSpeed      number = 7.2 [0..] m/s
gravity        number = 22 [0..] m/s²
maxFall        number = 45 [0..] m/s
coyoteTime     number = 0.12 [0..] s — Jump still allowed this long after leaving ground
jumpBuffer     number = 0.12 [0..] s — Jump pressed this early still counts on landing
eyeHeight      number = 1.6 [0.2..] m
crouchEye      number = 0.95 [0.2..] m
stepDistance   number = 2.3 [0.1..] m — Meters per footstep sound
fallDamage     number = 0 [0..] — Damage per m/s of landing speed above 16 m/s
footstepSound  sound id = "step"
jumpSound      sound id = "jump"
landSound      sound id = "land"
coyote         number = 0 — State
buffered       number = 0 — State
stepAcc        number = 0 — State: meters since the last footstep
wasGrounded    boolean = true — State
lastFallSpeed  number = 0 — State: vertical speed just before landing
landKick       number = 0 — Output: landing impact 0..1 (camera dip)
bobPhase       number = 0 — Output: head-bob phase (radians)
crouching      boolean = false — State
```

## Hazard

Damage over time to entities overlapping its sensor Body.

```
dps     number = 25 [0..] hp/s
filter  string = "any" — "any" or a tag the victim must have
sound   sound id = "" — Played when something enters
inside  number[] = [] — State: entities currently inside
```

## Health

Hit points with armor, regeneration, and on-death behavior (destroy, spawn, signals).

```
max             number = 100 [1..] hp
current         number = -1 — Starts at max when -1
armor           number = 0 [0..] — Armor points; absorb `armorAbsorb` of each hit
armorAbsorb     number = 0.6 [0..1]
regen           number = 0 [0..] hp/s
regenDelay      number = 3 [0..] s — Seconds after a hit before regen starts
invulnerable    boolean = false
destroyOnDeath  boolean = true
deathPrefab     prefab id = "" — Spawned where it dies (explosion, gibs)
deathEffect     effect id = "" — Effect played where it dies
hurtSound       sound id = "" — Played on each hit
onDeath         object[] = [] — Signals/messages when it dies
dead            boolean = false — State
lastHit         number = -999 — State: sim time of the last damage
```

## Interactable

Look-and-use target: shows a prompt and runs onUse signals when used.

```
prompt    string = "Use"
range     number = 2.5 [0.5..] m
onUse     object[] = []
once      boolean = false
cooldown  number = 0.5 [0..] s
sound     sound id = "button"
uses      integer = 0 — State
lastUse   number = -999 — State
```

## Interactor

Looks for Interactables along the view ray; "use" action activates the focused one.

```
action  string = "use" — Input action that uses the focused Interactable
reach   number = 3 [0.5..] m
focus   integer = -1 — State: focused Interactable entity (-1 = none)
prompt  string = "" — State: prompt text of the focus
```

## Inventory

Keys, ammo (by type), and items carried by the player (or any picker).

```
keys   string[] = [] — Key names, e.g. "red"
ammo   object = {} — Ammo type → rounds in reserve
items  object = {} — Item id → count
```

## Label

3D text sign: an unlit panel, readable from both sides, optionally facing the camera.

```
text        string = "Label" — Use \n for multiple lines
size        number = 0.4 [0.05..] m — Line height
color       string = "#ffffff"
background  string = "#141a22"
opacity     number = 0.8 [0..1] — Background opacity (0 = text only)
offset      n | [x,y,z] = [0,2.6,0] m
billboard   boolean = false — Always face the camera
```

## Light

Point or spot light at the entity (plus offset); optional flicker/pulse.

```
type       "point"|"spot" = "point"
color      string = "#ffe6c4"
intensity  number = 30 [0..] — Candela-like; ~20-80 lights a room corner
range      number = 12 [0..] m — Distance where light fades to zero (0 = infinite)
offset     n | [x,y,z] = [0,0,0] m
shadows    boolean = false — Costly: use on a few key lights only
angle      number = 40 [1..89] deg — Spot cone half-angle
aim        n | [x,y,z] = [0,-1,0] — Spot direction (world space)
flicker    number = 0 [0..1] — Random flicker amount
pulse      number = 0 [0..] Hz — Smooth pulsing rate
on         boolean = true — Toggle with the "toggle"/"on"/"off" signals
```

## Model

Visual model: a puppet (data/puppets) or inline primitive parts.

```
puppet   puppet id = "" — Puppet id; empty to use inline parts
parts    object[] = [] — Inline parts (used when puppet is empty)
tint     string = "" — Hex color multiplied into every part, e.g. "#ff8080"
visible  boolean = true
```

## Motion

Spins (deg/s per axis) and bobs (meters, Hz) an entity, e.g. pickups.

```
spin     n | [x,y,z] = [0,0,0] deg/s — Rotation speed around x, y, z
bob      number = 0 [0..] m — Bob height (0 = none)
bobRate  number = 0.5 [0..] Hz
baseY    number = 0 — State: resting height (captured on first tick)
started  boolean = false — State: baseY captured
```

## Mover

Waypoint motion (platforms, doors, elevators) controlled by signals; carries riders.

```
points    any[][] = [[0,0,0],[0,3,0]] — Offsets from the spawn position, in meters
speed     number = 2 [0.01..] m/s
wait      number = 1 [0..] s — Pause at each point
mode      "pingpong"|"loop"|"once" = "pingpong"
ease      "linear"|"smooth"|"sine"|"in"|"out"|"step"|"back" = "smooth"
active    boolean = true — Moving now
at        integer = 0 — State: index of the last point reached
to        integer = -1 — State: index being moved toward (-1 = not moving)
dir       integer = 1 — State: pingpong direction through points (+1 / -1)
goal      integer = -1 — State: stop on reaching this index (-1 = follow mode)
t         number = 0 — State: progress along the current segment 0..1
waitLeft  number = 0 — State: seconds left to wait
origin    n | [x,y,z] = 0 — State: spawn position (captured on first tick)
started   boolean = false — State: origin captured
delta     n | [x,y,z] = 0 — Output: displacement during the last tick
```

## Pickup

Collectible (health, armor, ammo, weapon, key, item) with optional respawn.

```
kind       "health"|"armor"|"ammo"|"weapon"|"key"|"item" = "health"
item       string = "" — Ammo type, weapon prefab id, key name, or item id
amount     number = 25 [0..]
respawn    number = 0 [0..] s — 0 = never comes back
sound      sound id = "pickup"
message    string = "" — HUD text; {amount} and {item} are replaced
taken      boolean = false — State
respawnAt  number = 0 — State
```

## Projectile

Ray-stepped projectile with direct damage, optional splash, gravity, and lifetime.

```
speed         number = 30 [0..] m/s
gravity       number = 0 m/s² — Downward acceleration (grenades ~ 12)
damage        number = 25 [0..]
splashRadius  number = 0 [0..] m — 0 = no splash
splashDamage  number = 0 [0..]
impulse       number = 6 [0..] — Knockback at the splash center
lifetime      number = 5 [0.05..] s
bounces       integer = 0 [0..] — Bounce off surfaces this many times before exploding
hitEffect     effect id = "" — Effect at impact (or explosion)
owner         integer = -1 — State: who fired it (not hit by its own shot)
age           number = 0 — State: seconds alive
velocity      n | [x,y,z] = 0 — State: current velocity
started       boolean = false — State: initial velocity set
```

## Respawn

After death, restore health and reload the room (or just revive) after a delay.

```
delay       number = 2.5 [0..] s
reloadRoom  boolean = true
diedAt      number = -1 — State: sim time of death (-1 = alive)
```

## RiftEnemy

A monster sentence: chassis + behavior + element + affix + optional boss patterns.

```
title       string = "Rift creature"
behavior    "stalker"|"gunner"|"charger"|"orbiter" = "stalker"
modifier    "none"|"swift"|"armored"|"volatile"|"vampiric" = "none"
speed       number = 4 [0..]
damage      number = 15 [0..]
baseHealth  number = 80 [1..]
boss        boolean = false
patterns    "shot"|"strike"|"nova"[] = ["shot","strike","nova"]
cooldown    number = 1 — State
windup      number = 0 — State
aim         n | [x,y,z] = 0 — State: committed attack target
phase       integer = 0 — State: attack pattern index
attack      string = "" — State: committed pattern
```

## RiftField

Optional arena tools; a single vocabulary shared with elemental combat.

```
kind      "launch"|"barrel"|"conduit"|"chill"|"overdrive"|"vortex"|"echo"|"rift" = "launch"
radius    number = 2.5 [0..]
cooldown  number = 0 — State
spent     boolean = false — State
```

## RoomExit

Sensor that loads another room (and spawn point) when the player enters.

```
room    room id = "" — Room id to load
spawn   string = "default" — SpawnPoint id in that room
locked  boolean = false — "unlock"/"lock" signals change this
```

## Spawner

Spawns prefabs (enemy waves, item drops) on signal or timer, with caps.

```
prefab    prefab id = ""
count     integer = 1 [1..] — Spawned per trigger
interval  number = 0 [0..] s — 0 = only on "spawn" signals
active    boolean = true — Interval spawning on ("start"/"stop" signals)
max       integer = 8 [1..] — Max alive from this spawner
total     integer = 0 [0..] — Lifetime cap (0 = unlimited)
radius    number = 0 [0..] m — Random horizontal offset
effect    effect id = "" — Effect at each spawn
spawned   integer = 0 — State: total spawned
alive     number[] = [] — State: living spawned entities
next      number = 0 — State: sim time of the next interval spawn
```

## SpawnPoint

Player spawn location; loadRoom picks one by id (default "default").

```
id    string = "default" — Spawn id used by room exits: { "room": "hub", "spawn": "from-arena" }
```

## Target

Knock-down target that scores points and resets (needs Health with destroyOnDeath false).

```
points     integer = 10
resetTime  number = 2.5 [0..] s — 0 = stays down
onHit      object[] = []
down       boolean = false — State
downAt     number = 0 — State
hits       integer = 0 — State: times knocked down
```

## Timer

Delayed or repeating signals (wave spawns, timed doors, countdowns).

```
seconds    number = 1 [0..] s
repeat     boolean = false
autostart  boolean = false
onFire     object[] = []
running    boolean = false — State
left       number = 0 — State: seconds until firing
started    boolean = false — State: autostart handled
```

## Transform

World-space position, rotation (quaternion), and scale.

```
pos    n | [x,y,z] = [0,0,0] m — Position in meters
rot    deg | [x,y,z] = 0 deg — Yaw degrees, or [x, y, z] Euler degrees (YXZ)
scale  n | [x,y,z] = 1 — Scale; a number scales uniformly
```

## Traversal

Optional air jump, directional dash, momentum slide and low-ledge mantle for the FPS controller.

```
dashCooldown     number = 2.2 [0.1..]
dashSpeed        number = 24 [0..]
airJumps         integer = 1 [0..5]
standingHeight   number = 1.8 [1..]
crouchingHeight  number = 1.05 [0.8..]
cooldown         number = 0 — State: dash cooldown remaining
dashing          number = 0 — State: dash seconds remaining
sliding          number = 0 — State: slide seconds remaining
jumpsUsed        integer = 0 — State: jumps used since leaving ground
actionTime       number = 0 — State: seconds left in an ability animation
actionClip       string = "cast" — Animation role used while actionTime is positive
direction        n | [x,y,z] = 0 — State: dash/slide direction
```

## Trigger

Sensor volume that sends signals/messages on enter and exit.

```
filter   string = "player" — "player", "any", or a tag the entering entity must have
onEnter  object[] = [] — Signals/messages when a matching entity enters
onExit   object[] = [] — Signals/messages when it leaves
once     boolean = false — Only fire the first time
fired    integer = 0 — State: times onEnter ran
inside   integer = 0 — State: matching entities inside now
```

## Weapon

Weapon stats: hitscan/projectile/melee, damage, spread, rate, ammo, magazine, effects.

```
name          string = "Weapon"
slot          integer = 1 [1..9] — Number key that selects it
mode          "hitscan"|"projectile"|"melee" = "hitscan"
damage        number = 20 [0..] — Per pellet (hitscan/melee)
pellets       integer = 1 [1..64]
spread        number = 1 [0..45] deg — Random cone half-angle
range         number = 120 [0.5..] m
rate          number = 3 [0.1..] shots/s
automatic     boolean = false — Keeps firing while held
ammo          string = "bullets" — Inventory ammo type ("" = unlimited)
ammoPerShot   integer = 1 [0..]
magazine      integer = 12 [0..] — 0 = fires straight from reserve (no reloads)
reloadTime    number = 1.2 [0..] s
startAmmo     integer = 36 [0..] — Reserve ammo granted when first picked up
projectile    prefab id = "" — Projectile mode: prefab spawned per shot
impulse       number = 4 [0..] — Push on physics props per hit
kick          number = 1.2 [0..] deg — Aim kick upward per shot
sound         sound id = "pistol"
emptySound    sound id = "empty"
reloadSound   sound id = "reload"
muzzleEffect  effect id = "muzzle"
impactEffect  effect id = "impact"
tracer        effect id = "tracer"
viewmodel     puppet id = "" — First-person model
```
