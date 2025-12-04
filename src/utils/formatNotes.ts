/**
 * Formats notes field from purchase orders
 * Handles both plain text and JSON notes
 * Filters out redundant material details that are already displayed elsewhere
 */
export function formatNotes(notes: string | undefined | null): string | null {
  if (!notes || typeof notes !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmedNotes = notes.trim();
  if (!trimmedNotes) {
    return null;
  }

  // Check if it's JSON
  if (trimmedNotes.startsWith('{') || trimmedNotes.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmedNotes);
      
      // If it's an object with userNotes, try to extract that
      if (parsed.userNotes && typeof parsed.userNotes === 'string') {
        // userNotes might also be JSON, try to parse it
        try {
          const userNotesParsed = JSON.parse(parsed.userNotes);
          // If it's just a duplicate of the parent object, ignore it
          if (JSON.stringify(userNotesParsed) === JSON.stringify(parsed)) {
            return null; // It's redundant, don't show it
          }
        } catch {
          // userNotes is plain text, use it
          return parsed.userNotes;
        }
      }
      
      // If the JSON contains meaningful fields, format them nicely
      // But if it's just material details (which we already show), don't display it
      const materialFields = ['materialName', 'materialCategory', 
                             'materialBatchNumber', 'quantity', 'unit', 'costPerUnit',
                             'minThreshold', 'maxCapacity', 'qualityGrade', 'isRestock'];
      
      const hasOnlyMaterialFields = Object.keys(parsed).every(key => 
        materialFields.includes(key) || key === 'userNotes'
      );
      
      if (hasOnlyMaterialFields) {
        // This is just material details, we already display these fields separately
        return null;
      }
      
      // Otherwise, format it as a readable string
      const readableParts: string[] = [];
      Object.entries(parsed).forEach(([key, value]) => {
        if (key !== 'userNotes' && value !== null && value !== undefined && value !== '') {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          readableParts.push(`${formattedKey}: ${value}`);
        }
      });
      
      return readableParts.length > 0 ? readableParts.join(', ') : null;
    } catch {
      // Not valid JSON, treat as plain text
      // But check if it's just formatted material details
      return checkIfMaterialDetailsString(trimmedNotes);
    }
  }
  
  // Plain text notes - check if it's just material details
  return checkIfMaterialDetailsString(trimmedNotes);
}

/**
 * Checks if a string contains only material details that are already displayed elsewhere
 */
function checkIfMaterialDetailsString(notes: string): string | null {
  // Patterns that indicate this is just material details
  const materialDetailPatterns = [
    /^Material Name:/i,
    /Material Brand:/i,
    /Material Category:/i,
    /Material Batch Number:/i,
    /Quantity:/i,
    /Unit:/i,
    /Cost Per Unit:/i,
    /Min Threshold:/i,
    /Max Capacity:/i,
    /Quality Grade:/i,
    /Is Restock:/i
  ];

  // Check if the notes start with material detail patterns
  const startsWithMaterialDetail = materialDetailPatterns.some(pattern => 
    pattern.test(notes)
  );

  if (startsWithMaterialDetail) {
    // Count how many material detail patterns are present
    const patternCount = materialDetailPatterns.filter(pattern => 
      pattern.test(notes)
    ).length;

    // If it contains 3 or more material detail patterns, it's likely just material details
    // Also check if it doesn't contain other meaningful text
    const hasOtherText = !/^(Material|Quantity|Unit|Cost|Min|Max|Quality|Is Restock|Batch)/i.test(notes.split(',')[0]?.trim() || '');
    
    if (patternCount >= 3) {
      // This is likely just formatted material details
      return null;
    }
  }

  // Check for common phrases that indicate it's a real note
  const realNoteIndicators = [
    /procurement order/i,
    /special instruction/i,
    /delivery note/i,
    /please note/i,
    /important/i,
    /urgent/i,
    /contact/i,
    /call/i,
    /email/i
  ];

  const hasRealNoteContent = realNoteIndicators.some(pattern => pattern.test(notes));
  
  if (hasRealNoteContent) {
    return notes; // This is a real note, show it
  }

  // If it's very short and doesn't look like material details, show it
  if (notes.length < 50 && !startsWithMaterialDetail) {
    return notes;
  }

  // If it starts with material details but is short, might be a real note
  if (startsWithMaterialDetail && notes.length < 100) {
    // Check if it has any non-material detail content
    const nonMaterialContent = notes.replace(/Material (Name|Brand|Category|Batch Number):[^,]*/gi, '')
      .replace(/Quantity:|Unit:|Cost Per Unit:|Min Threshold:|Max Capacity:|Quality Grade:|Is Restock:/gi, '')
      .trim();
    
    if (nonMaterialContent.length > 10) {
      return notes; // Has other content, show it
    }
    
    return null; // Just material details
  }

  // Default: show the notes if we're not sure
  return notes;
}

