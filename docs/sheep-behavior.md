# Sheep behavior, in human terms

A plain-language summary of every rule about how the sheep behave. Written 2026-11-16 from the rule specs under `.claude/sheep/implemented/` (POC-v2 `flock-behavior.md`, POC-v3 `course-and-flock.md` and `dog-behavior.md`, POC-v7 `gate-attraction.md`, POC-v9 `flock-behavior.md`, POC-v12 `obstacles.md`, POC-v13 `flock-behavior.md`) and `.claude/sheep/brainstorming/force-model.md`. It summarizes the specs; it was not checked against `web/sheep/lib/sheep-sim.js`. The specs remain the source of truth, and rule IDs are given in brackets.

## Left alone

- **They stand around and graze.** Most sheep barely move, with the odd one-body-length shuffle so the field looks alive. [A1, A2]
- **A few wander.** A small minority (about 12%) drift slowly in a random direction. [A3]
- **They sit in loose little groups.** Groups of 1 up to about 10 (slider) are scattered across the field, and singletons are fine. [A5, A6, H1]
- **They don't clump into one blob.** Nothing pulls them to a common centre; slow merging over minutes is acceptable, but not within a run's opening. [A4]
- **An off-duty dog doesn't bother them.** A dog at heel exerts no pressure, though grazing sheep keep a little distance from him without fleeing. [A7, A8]

## When the dog works them

- **Pressure wakes them up instantly.** A threatened sheep drops grazing and its small group, and behaves as part of one responsive flock. [B1]
- **They move away from the dog.** The closer he is and the more squarely he faces them, the harder they move; his stare counts more than his mere presence.
- **In a flock they keep together but not too close.** They pull toward nearby neighbours, push off ones that are too close, and only loosely match each other's direction.
- **Bad pressure splits them.** Pushing into the middle of the flock sends the halves in opposite directions.
- **Bold sheep hold their ground.** Each sheep has its own boldness: a brave one ignores light pressure and may stamp toward the dog before giving way.
- **Heavy pressure causes panic.** A panicked sheep sprints, and will bolt through any gap in the dog's coverage.
- **A lying dog is a soft wall.** Sheep won't cross in front of him unless the flock behind shoves them through, though the very boldest (0–2 in 80) may occasionally dart round. [D1, D2]
- **They stay inside the fence.** Walls push them back.

## Calming down

- **They settle after about 3 seconds without threat.** Each sheep goes back to grazing and joins whoever settled nearby.
- **A gathered flock drifts apart again.** Leave them too long and they relax back into scattered groups, which is the time pressure in a run. [B2]

## The trot

- **A big flock can break into a trot.** When more than 12 are flowing the same way under pressure, there is a 20% chance per second that the front few speed up. [T1]
- **They stream off when the dog stops or turns.** When he ends or reverses a flank beside a collected group, the group is likely to trot away from him, even from a standstill. [T5]
- **Only a group the dog is working trots.** A real share of the group must be properly pressed; sheep from other groups and grazing sheep are never pulled in. [T8]
- **The rest file in behind.** Nearby sheep fall in behind a trotting one, forming a column; 5% of the time the whole flock goes at once. [T2]
- **Four gaits.** Grazing (about 15 px/s), a walk (up to 60), a slow trot (up to 80) and a panic sprint (up to 126). A whole flock bolting at once runs at a full trot (about 95). [T9]
- **A steady walk-on brings on the slow trot.** After the dog has walked on for a few seconds, the front-and-centre sheep of the group he is driving may break into a slow trot and the rest of that group follow. [T10]
- **It fades once they escape the dog.** The chance of dropping out grows from 35% to 90% per second over about 3 seconds. [T3]
- **It never lasts long.** A sheep trots for about 4 seconds at most, pressure or not, then rests about 6 seconds before it can trot again. [T6]
- **They wind down through a walk.** A sheep leaving the trot walks on along its line, slowing to a stand over about 3 seconds, then goes back to grazing. [T7]
- **They won't trot into a fence.** A trotting sheep heading at a wall within about 3 body-lengths stops, except at the gate mouth. [T3]
- **Head them and they turn.** If the dog gets in front of a trotting sheep, it reverses and the column swings round behind it. [T4]

## At the gate

- **The gate draws them in.** Within about 100 px of the mouth a sheep is pulled toward it, whether or not the dog is pushing. [G2]
- **The draw reaches out to a trotting line.** While a trot's leaders are heading for the gate, the draw area grows a cone toward them, so the line is caught from further away. Grazing sheep are not affected. [G5]
- **They go through in single file.** A sheep close to one being drawn follows that sheep rather than the gate, so the flock arrives as a line, not a wall. [G3]
- **Once committed, they keep going.** A sheep near the gate and heading for it carries on through without stalling or needing more pressure. [G1]
- **The dog still outranks the gate.** The draw is weaker than fear, so a dog working the mouth can pull sheep off it. [G4]
- **Too much pressure jams them.** Many sheep pushed at a narrow mouth pile up; easing off lets the front trickle through.

## Trees and rocks

- **Nothing walks through them.** A sheep is never inside an obstacle, however hard it is pressed. [O3]
- **They go round, and split.** Each sheep passes on the side it is already on, so a flock meeting one squarely parts into two groups and both get past. [O4]
- **Obstacles are cover.** A sheep behind one doesn't feel the dog until he comes round. [O5]
- **A trotting column sidesteps rather than stops.** [Q69]
- **Rocks shield a blast (assault version).** A rock between a mortar blast and a sheep protects it completely; trees do not. [O9]
