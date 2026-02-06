/**
 * Extract image URL from a Generate_Image tool result.
 * Handles multiple possible result shapes (direct string, nested objects, markdown image syntax, URL patterns).
 */
export function extractGeneratedImageUrl(content: any): string | null {
  if (!content) return null;
  
  // Try various possible shapes of the result
  const candidates: string[] = [];
  
  // Direct content string
  if (typeof content === "string") {
    candidates.push(content);
  }
  
  // content.content (common shape: { tool_call_id, name, content: "..." })
  if (typeof content.content === "string") {
    candidates.push(content.content);
  }
  
  // Direct URL fields
  if (typeof content.image_url === "string") candidates.push(content.image_url);
  if (typeof content.imageUrl === "string") candidates.push(content.imageUrl);
  if (typeof content.url === "string") candidates.push(content.url);
  
  // Stringify object as fallback
  if (typeof content === "object") {
    try {
      candidates.push(JSON.stringify(content));
    } catch {}
  }
  
  // Extract URL from candidates
  for (const c of candidates) {
    // Markdown image: ![alt](url)
    const mdMatch = c.match(/!\[[^\]]*]\(([^)\s]+)\)/);
    if (mdMatch && mdMatch[1]) return mdMatch[1];
    
    // URL with /images/ path
    const imgPathMatch = c.match(/https?:\/\/[^\s)"]+\/images\/[^\s)"]+/);
    if (imgPathMatch && imgPathMatch[0]) return imgPathMatch[0];
    
    // URL ending in image extension
    const extMatch = c.match(/https?:\/\/[^\s)"]+\.(png|jpe?g|webp|gif)(\?[^\s)"]+)?/i);
    if (extMatch && extMatch[0]) return extMatch[0];
  }
  
  return null;
}
