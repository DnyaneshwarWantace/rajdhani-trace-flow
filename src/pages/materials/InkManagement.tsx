import MaterialList from './MaterialList';

/**
 * Ink Management – separate section for ink category materials.
 * Uses the same MaterialList with category locked to "Ink".
 */
export default function InkManagement() {
  return (
    <MaterialList
      categoryFilter="Ink"
      pageTitle="Ink Management"
      pageSubtitle="Manage ink inventory"
    />
  );
}
