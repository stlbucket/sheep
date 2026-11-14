# Sheepdog Prototype

Glossary for the sheepdog-trial herding game. One context: a 2D simulation of a
dog applying pressure to a flock, plus the tuning vocabulary we use to talk
about it. Definitions only — the *how* lives in
[`.claude/sheep/brainstorming/force-model.md`](.claude/sheep/brainstorming/force-model.md),
[`threat-model.md`](.claude/sheep/brainstorming/threat-model.md) and
[`lever-model.md`](.claude/sheep/brainstorming/lever-model.md).

## Language

### The world

**Pasture**:
The bounded ground a run takes place on, together with everything that makes it
*this* challenge rather than another one — its size, its perimeter fence, where
the gate sits, and where the flock starts.
_Avoid_: field, course, stage, arena, level

**Gate**:
The single gap in the pasture's perimeter fence. It is the destination: sheep
that pass through it have left the pasture and are penned.
_Avoid_: pen, goal, exit, target

**Pen**:
The apron of ground immediately outside the gate where penned sheep settle.
Distinct from the gate itself.

**Draw**:
The pull the gate itself exerts on a sheep near its mouth — and, through
that sheep, on the sheep close behind it — so a flock files through in a
column instead of pressing the posts as a wall. A property of the gate, not
of the dog; weaker than threat.
_Avoid_: suction, attraction (the code says `gateAttract`; the word is draw)

**Fence**:
The pasture's perimeter boundary. Sheep are repelled by it; the dog uses it as a
wall to work sheep against.

**Obstacle**:
A solid thing standing in the pasture — a small stand of trees or a large rock. Nothing walks through one: a flock flows round it and readily parts in two, and the dog runs round it. How many a pasture carries is drawn per run, usually very few.
_Avoid_: terrain, tree, prop, hole (a hole is an empty patch of the starting layout, not a thing)

**Cover**:
What an obstacle gives a sheep standing behind it: out of the dog's sight, so out of his threat, until he comes round.
_Avoid_: occlusion, shadow, hiding

### The animals

**Flock**:
All sheep in the pasture, considered as one body. The flock has emergent
properties — a center, a shape, a cohesion — that no individual sheep has.
_Avoid_: herd, mob, blob, swarm

**Group**:
A handful of sheep standing together at rest, one of many scattered across an
idle pasture. Groups are what a flock relaxes into when unpressured; they are
not sub-flocks.
_Avoid_: cluster, clump, bunch

**Split**:
A sub-flock that has broken away under pressure and is being counted as a
separate body. A split is a fault; a group is not.

**Straggler**:
A sheep that has been outside the flock body long enough to count against the
run.

**Boldness**:
A per-sheep constant, drawn once at spawn, setting how much threat that sheep
will tolerate before reacting. High boldness is what makes a darter possible.
_Avoid_: bravery, courage, flightiness (flightiness is the flock-wide *lever*,
not the per-sheep constant)

**Dog**:
The single agent the player commands. The dog never touches sheep; it moves and
it applies threat, nothing else.

### Pressure

**Threat**:
The scalar, per-sheep, 0–1 quantity the dog projects onto each sheep. Everything
the dog does to the flock, it does by changing this number.
_Avoid_: pressure, influence, force, fear

**Eye**:
The directional component of threat — the dog's gaze cone, strongest along its
facing and falling off to the sides.
_Avoid_: cone, gaze, stare, line of sight

**Ambient**:
The non-directional component of threat — the floor a sheep feels from a nearby
dog regardless of where the dog is looking.

**Emit / receive**:
The ownership split for threat. The **dog emits** — it shapes where and how
strongly threat exists. The **sheep receives** — it decides what to do about the
threat it feels. No quantity belongs to both sides.

### Commanding

**Command**:
What the player asks for: come by, away, walk on, easy, lie down, that'll do.
A command is an input, not a state. (*Stand* was retired in POC-v6; *easy*
took its slot.)

**State**:
What the dog is actually doing right now. The dog changes state on its own —
finishing a flank hands off to easy, a stalled drive converts to easy — so
state can differ from the last command. The command strip always shows state.

**Posture**:
A stationary blocking state — lie down (the only one since POC-v6). A posture
projects a hard, narrow eye and soft flanks: a one-way wall with darting space
around it.

**Easy**:
The slow drive: the dog advances on the flock from behind at about a third of
walk-on speed, never closing past the trail gap. Where a flank ends, where a
stalled drive rests, and where an impulse fires from. Creeping, not holding.

**Perimeter**:
The herd's outline — the convex hull of the working flock, a sim concept. The
flanking dog tracks it at his standoff; the drawn dotted outline is the same
hull at a display margin.
_Avoid_: outline (for the sim concept), circle

**Flank**:
The dog's working path around the flock edge — come by (clockwise) or away
(counter-clockwise). A flank is always finite and always ends in a drive.
_Avoid_: orbit, circle, arc

**Gate line** (was *balance point*):
The spot on the perimeter opposite the gate through the flock — where pushing
sends the flock at the gate. It is where the flank aims *and* where it stops
(since POC-v6; the overshoot dial can carry it further).

**Handoff**:
The dog's self-initiated transition from flank to easy, taken on arrival at
the gate line. No player input is involved.

**Drive**:
The walk-on state: the dog presses from behind and never closes on the rear
sheep.

**Impulse**:
A short, decaying boost of threat fired by tapping walk-on from easy — a
shove, a bark, or a lean. The gate-working rhythm.

### Tuning

**Lever**:
A single named 0–1 dial that moves a whole family of raw params together along a
hand-authored curve. Twelve of them, in three domains. Levers are what we tune
in conversation; they are not what the simulation reads.

**Raw param**:
One entry in the settings schema — a number the simulation actually reads. Raw
params remain the single source of truth; levers only write to them.
_Avoid_: setting, tunable, knob, slider (a slider is the UI, not the value)

**Endpoint profile**:
The full set of raw-param values a lever emits at 0.0 or at 1.0. Each one is
hand-authored to be a coherent world on its own, so every position between them
is too.

**Anchor**:
The rule that every lever at 0.5 reproduces the shipped defaults exactly.
Resetting all levers to 0.5 gives back the measured-good simulation.

**Stamp-and-release**:
How a lever behaves: moving it writes its raw params once, then it stops
claiming them. A raw param edited by hand afterwards simply wins, and the lever
reads as modified.

**Domain**:
One of the three lever families — **dog-behavior**, **sheep-behavior**,
**pasture-builder**. Every lever belongs to exactly one; so does every raw param
a lever owns.

**Judging**:
The unmodelled fourth area: what a straggler *is*, what counts as a split, when
crowding becomes an injury. Distinct from how harshly a given pasture weighs
those things, which is the pasture's Strictness lever.
_Avoid_: scoring (scoring is the output; judging is the definitions behind it)
