/**
 * Safely extracts an error message from an unknown caught value.
 * Use in catch blocks instead of `(error: any)`.
 *
 * @example
 * try { ... } catch (err) {
 *   return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
 * }
 */
export function getErrorMessage(error: unknown): string {
  console.error('[getErrorMessage] Captured error:', error);
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Une erreur inattendue est survenue';
}
