// File: src/utils/voiceOrdering.js
import { showCustomAlert } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { POSDatabase } from '../db/posDatabase.js';

let recognition;
let finalTranscript = '';
let interimTranscript = '';
let voiceOrderingActive = false;
let voiceOutputElement, startVoiceOrderBtn;
let orderUpdateCallback;
let menuItems = [];

const quantityWords = {
  "एक": 1, "1": 1,
  "दो": 2, "2": 2,
  "तीन": 3, "3": 3,
  "चार": 4, "4": 4,
  "पांच": 5, "5": 5
};

// Utility
function normalize(text) {
    if (typeof text !== 'string') return ''; // Ensure text is a string
    return text
      .toLowerCase()
      .replace(/\s+/g, "") // remove all whitespace
      .replace(/[^\u0900-\u097F\w]/g, ""); // remove punctuation except Devanagari and alphanumerics
  }
  
function normalizeText(str) {
    if (typeof str !== 'string') return ''; // Ensure str is a string
    return str
      .toLowerCase()
      .replace(/\s+/g, '')       // remove spaces
      .replace(/[^\p{L}\p{N}]/gu, ''); // remove punctuation/symbols (Unicode safe)
  }
  
  function normalizeArray(arr) {
    return (arr || []).map(v => normalize(v));
  }
  
  function matchVariant(spokenNorm, item) {
    console.log("🔍 Checking variants for item:", item.name);
    console.log("🗣️ Normalized spoken text for variant matching:", spokenNorm); // Updated log
  
    if (!item.variants || !item.variants.length) {
      console.log("      ⚠️ No variants found for this item in DB."); // Clarified log
      return { variantName: null, remainingText: spokenNorm }; // Return original spokenNorm if no match
    }
  
    for (const variant of item.variants) {
      // Ensure variantKeywords and variantKeywordsHindi are always arrays for normalizeArray
      const enKeywords = normalizeArray(Array.isArray(variant.variantKeywords) ? variant.variantKeywords : (variant.variantKeywords ? [variant.variantKeywords] : []));
      // Use split(",") for Hindi keywords
      const hiKeywords = normalizeArray(Array.isArray(variant.variantKeywordsHindi) ? variant.variantKeywordsHindi : (variant.variantKeywordsHindi ? variant.variantKeywordsHindi.split(",") : []));
  
      console.log(`      🔎 Checking variant: ${variant.name}`);
      console.log("        - English keywords:", enKeywords);
      console.log("        - Hindi keywords:", hiKeywords);
  
      for (const keywordNorm of [...enKeywords, ...hiKeywords]) {
        if (keywordNorm === '') continue; // Skip empty keywords
        console.log("        ↪ Comparing with keyword:", keywordNorm);
        // Use a more precise match or ensure the spokenNorm is reduced
        if (spokenNorm.includes(keywordNorm)) {
          console.log("      ✅ Matched variant:", variant.name);
          return {
              variantName: variant.name,
              remainingText: spokenNorm.replace(keywordNorm, '').trim() // Return text AFTER removing keyword
          };
        }
      }
    }
  
    console.log("      ❌ No variant matched in remaining text."); // Updated log
    return { variantName: null, remainingText: spokenNorm }; // Return original spokenNorm if no match
  }
  
  function matchModifiers(spokenNorm, item) {
    console.log("🔍 Checking modifiers for item:", item.name);
    console.log("🗣️ Normalized spoken text for modifier matching:", spokenNorm); // Updated log
  
    const matched = [];
    if (!item.modifiers || !item.modifiers.length) {
      console.log("      ⚠️ No modifiers found for this item in DB."); // Clarified log
      return { matchedModifiers: matched, remainingText: spokenNorm };
    }
  
    let currentRemainingText = spokenNorm; // Local variable to progressively reduce
    for (const mod of item.modifiers) {
      // Ensure modifierKeywords and modifierKeywordsHindi are always arrays for normalizeArray
      const enKeywords = normalizeArray(Array.isArray(mod.modifierKeywords) ? mod.modifierKeywords : (mod.modifierKeywords ? [mod.modifierKeywords] : []));
      // Use split(",") for Hindi keywords
      const hiKeywords = normalizeArray(Array.isArray(mod.modifierKeywordsHindi) ? mod.modifierKeywordsHindi : (mod.modifierKeywordsHindi ? mod.modifierKeywordsHindi.split(",") : []));
  
      console.log(`      🔎 Checking modifier: ${mod.name}`);
      console.log("        - English keywords:", enKeywords);
      console.log("        - Hindi keywords:", hiKeywords);
  
      for (const keywordNorm of [...enKeywords, ...hiKeywords]) {
        if (keywordNorm === '') continue; // Skip empty keywords
        console.log("        ↪ Comparing with keyword:", keywordNorm);
        if (currentRemainingText.includes(keywordNorm)) { // Check against current remaining text
          console.log("      ✅ Matched modifier:", mod.name);
          matched.push(mod.name);
          currentRemainingText = currentRemainingText.replace(keywordNorm, '').trim(); // Update locally
          break; // Move to the next modifier, as this keyword is found
        }
      }
    }
  
    if (!matched.length) {
      console.log("      ❌ No modifiers matched in remaining text."); // Updated log
    }
  
    return { matchedModifiers: matched, remainingText: currentRemainingText };
  }
  
  function findMenuItem(spoken) {
    const spokenNorm = normalize(spoken);
    let bestMatch = null;
    let bestLength = 0;
  
    console.log("[VoiceOrdering] Trying to match item:", spokenNorm);
  
    // Prioritize exact matches or longest matches
    for (const item of menuItems) {
      const nameNorm = normalize(item.name || '');
      const hindiNorm = normalize(item.nameHindi || '');
  
      console.log("      ↪ Checking:", item.name, "|", item.nameHindi);
  
      // If the spoken normalized text is exactly the item name or Hindi name
      if (spokenNorm === nameNorm || spokenNorm === hindiNorm) {
          console.log(`      ✅ Exact match found: ${item.name}`);
          return item; // Return exact match immediately
      }
  
      // For partial matches (e.g., "lassi chota" containing "lassi")
      if (spokenNorm.includes(nameNorm) && nameNorm.length > bestLength) {
          bestMatch = item;
          bestLength = nameNorm.length;
      }
      if (spokenNorm.includes(hindiNorm) && hindiNorm.length > bestLength) {
          bestMatch = item;
          bestLength = hindiNorm.length;
      }
    }
  
    if (bestMatch) {
      console.log("[VoiceOrdering] ✅ Matched item (partial or best):", bestMatch.name);
    } else {
      console.warn("[VoiceOrdering] ❌ No match for:", spokenNorm);
    }
  
    return bestMatch;
  }
  
// Init voice system
export async function initVoiceOrdering(mainElement, callback) {
  orderUpdateCallback = callback;
  voiceOutputElement = mainElement.querySelector("#voiceOutput");
  startVoiceOrderBtn = mainElement.querySelector("#startVoiceOrderBtn");

  // Fetch all menu items once at initialization
  const allItems = await POSDatabase.getAll("menuItems");
  const allVariants = await POSDatabase.getAll("variants");
  const allModifiers = await POSDatabase.getAll("modifiers");

  // Enrich menuItems with their variants and modifiers
  menuItems = allItems.map(item => ({
      ...item,
      variants: allVariants.filter(v => v.itemId === item.id),
      modifiers: allModifiers.filter(m => m.itemId === item.id)
  }));


  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showCustomAlert("Your browser doesn't support speech recognition.");
    startVoiceOrderBtn.disabled = true;
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN'; // Set to Hindi
  recognition.interimResults = true;
  recognition.continuous = false; // Changed to false, typically for single commands

  recognition.onstart = () => {
    finalTranscript = '';
    voiceOutputElement.textContent = "🎙️ सुन रहा हूँ...";
    voiceOrderingActive = true;
    startVoiceOrderBtn.classList.add('active'); // Add active state visual feedback
  };

  recognition.onresult = (event) => {
    interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    console.log('[VoiceOrdering] Interim:', interimTranscript);
    voiceOutputElement.textContent = finalTranscript + interimTranscript;
  };

  recognition.onend = () => {
    voiceOrderingActive = false;
    startVoiceOrderBtn.classList.remove('active'); // Remove active state visual feedback
    voiceOutputElement.textContent = '🔍 संसाधित हो रहा है...';
    processCommand(finalTranscript.trim());
    finalTranscript = '';
  };

  recognition.onerror = (event) => {
    console.error('[VoiceOrdering] Error:', event.error);
    voiceOutputElement.textContent = `⚠️ त्रुटि: ${event.error}`;
    voiceOrderingActive = false;
    startVoiceOrderBtn.classList.remove('active');
    showCustomAlert(`Speech recognition error: ${event.error}`, "error");
  };

  startVoiceOrderBtn.onclick = () => {
    if (voiceOrderingActive) {
      recognition.stop();
    } else {
      // Request microphone access only when trying to start recognition
      navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
        recognition.start();
      }).catch(err => {
        console.error('Microphone error:', err);
        showCustomAlert("🎤 माइक्रोफोन एक्सेस नहीं मिला", "error");
      });
    }
  };
  console.log("[VoiceOrdering] Loaded items:", menuItems.map(m => ({
    name: m.name,
    nameHindi: m.nameHindi,
    variants: m.variants.map(v => v.name),
    modifiers: m.modifiers.map(mod => mod.name)
  })));
}

// Command parser
function processCommand(text) {
    console.log('[VoiceOrdering] Final Transcript:', text);
  
    const parts = text.split(/\s+/);
    let qty = 1;
    let spokenItemPhrase = []; // Store the full phrase that includes item, variant, modifiers
  
    // Extract quantity and the rest of the spoken phrase
    for (let word of parts) {
      const num = quantityWords[word];
      if (num) {
        qty = num;
      } else {
        spokenItemPhrase.push(word);
      }
    }
  
    const fullSpokenPhrase = spokenItemPhrase.join(" "); // e.g., "लस्सी स्मॉल ड्राई फ्रूट"
    let normalizedRemainingSpoken = normalize(fullSpokenPhrase); // e.g., "लस्सीस्मॉलड्राईफ्रूट"
  
    console.log('[VoiceOrdering] Parsed quantity:', qty);
    console.log('[VoiceOrdering] Full item phrase spoken:', fullSpokenPhrase);
  
    // Step 1: Find item
    const matchedItem = findMenuItem(fullSpokenPhrase); // Use the full phrase to find the item
  
    if (matchedItem) {
        // Crucial Change: Remove the matched item's name from the remaining spoken text
        const itemNameNorm = normalize(matchedItem.name || '');
        const itemHindiNameNorm = normalize(matchedItem.nameHindi || '');

        if (itemNameNorm && normalizedRemainingSpoken.includes(itemNameNorm)) {
            normalizedRemainingSpoken = normalizedRemainingSpoken.replace(itemNameNorm, '');
        } else if (itemHindiNameNorm && normalizedRemainingSpoken.includes(itemHindiNameNorm)) {
            normalizedRemainingSpoken = normalizedRemainingSpoken.replace(itemHindiNameNorm, '');
        }
        normalizedRemainingSpoken = normalizedRemainingSpoken.trim(); // Clean up any extra spaces


        // Step 2: Match variant (if any)
        let variantName = null;
        let remainingTextAfterVariant = normalizedRemainingSpoken; // Initialize with text after item name

        if (normalizedRemainingSpoken.length > 0) {
            const variantMatchResult = matchVariant(normalizedRemainingSpoken, matchedItem);
            variantName = variantMatchResult.variantName;
            remainingTextAfterVariant = variantMatchResult.remainingText; // Get the truly remaining text
            if (variantName) {
                console.log('[VoiceOrdering] Matched variant:', variantName);
            }
        }
  
        // Step 3: Match modifiers (if any)
        let modifierNames = [];
        // Only try to match if there's text left after variant matching
        if (remainingTextAfterVariant.length > 0) {
            const modifierMatchResult = matchModifiers(remainingTextAfterVariant, matchedItem);
            modifierNames = modifierMatchResult.matchedModifiers;
            // You could store modifierMatchResult.remainingText here if needed for further parsing
            if (modifierNames.length) {
                console.log('[VoiceOrdering] Matched modifiers:', modifierNames);
            }
        }
  
        // Step 4: Trigger callback
        orderUpdateCallback('addItem', {
            itemToAdd: matchedItem,
            quantity: qty,
            variantName,
            modifierNames
        });
    } else {
        console.warn('[VoiceOrdering] Item not matched.');
        orderUpdateCallback('error', {
            message: `❌ "${fullSpokenPhrase}" आइटम नहीं मिला`
        });
    }
  
    console.log("[VoiceOrdering] Parsed item name (from full phrase):", fullSpokenPhrase);
}
  
export function speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech Synthesis not supported by this browser.");
    }
  }