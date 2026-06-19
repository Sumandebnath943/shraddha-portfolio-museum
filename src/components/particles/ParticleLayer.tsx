// Deprecated: the particle field now lives inside the constellation canvas
// (see ParticleField rendered from Scene.tsx), parented to the camera. Kept as
// a no-op so nothing imports a stale two-canvas layer.
export default function ParticleLayer() {
  return null;
}
