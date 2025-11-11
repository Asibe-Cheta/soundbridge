// Help content for upload form fields
export const uploadFieldHelp = {
  title: {
    title: "Track Title",
    content: "Enter the name of your track. This will be displayed prominently in the app and on your profile. Keep it concise but descriptive.",
    placeholder: "Enter track title"
  },
  
  artistName: {
    title: "Artist Name",
    content: "Your stage name or the name you want to be credited as. This can be your real name, a stage name, or your band name.",
    placeholder: "Enter artist name"
  },
  
  description: {
    title: "Description",
    content: "Describe your track, the inspiration behind it, or any other details you'd like to share with listeners. This helps people discover your music.",
    placeholder: "Describe your track..."
  },
  
  genre: {
    title: "Genre",
    content: "Select the primary genre that best describes your track. This helps with categorization and discovery by listeners who enjoy similar music.",
    placeholder: "Select genre"
  },
  
  tags: {
    title: "Tags",
    content: "Add relevant tags separated by commas (e.g., 'electronic, ambient, chill'). Tags help with search and discovery. Use 3-5 relevant tags for best results.",
    placeholder: "e.g., electronic, ambient, chill"
  },
  
  lyrics: {
    title: "Lyrics",
    content: "Optional: Add the lyrics to your track. This helps listeners follow along and can improve engagement. You can add them later if you don't have them ready now.",
    placeholder: "Enter song lyrics (optional)..."
  },
  
  lyricsLanguage: {
    title: "Lyrics Language",
    content: "Select the primary language of your lyrics. This helps with proper display and search functionality.",
    placeholder: "Select language"
  },
  
  copyrightYear: {
    title: "Copyright Year",
    content: "The year this track was created or first published. This is important for copyright protection and professional distribution.",
    placeholder: "2025"
  },
  
  copyrightHolder: {
    title: "Copyright Holder",
    content: "The person or entity that owns the copyright to this track. Usually this is the artist, record label, or music publisher.",
    placeholder: "Your name or record label"
  },
  
  publishingRights: {
    title: "Publishing Rights",
    content: "All Rights Reserved: You retain all rights to your music. Creative Commons: Allows others to use with attribution. Public Domain: No copyright restrictions.",
    placeholder: "Select publishing rights"
  },
  
  language: {
    title: "Track Language",
    content: "The primary language of the vocals or spoken content in your track. This helps with categorization and search.",
    placeholder: "Select language"
  },
  
  explicitContent: {
    title: "Explicit Content",
    content: "Check this box if your track contains explicit language, mature themes, or content that may not be suitable for all audiences.",
    placeholder: "Contains explicit content"
  },
  
  coverImage: {
    title: "Cover Art",
    content: "Upload artwork for your track. Recommended size: 1000x1000 pixels. This will be displayed in the player and track listings.",
    placeholder: "Select cover image"
  },
  
  audioFile: {
    title: "Audio File",
    content: "Upload your track file. Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC. Maximum size: 100MB. Higher quality files provide better sound.",
    placeholder: "Select audio file"
  }
};

// Professional standards help content
export const professionalStandardsHelp = {
  isrc: {
    title: "ISRC (International Standard Recording Code)",
    content: "ISRC is automatically generated for your track in the format: Country-Registrant-Year-Designation (e.g., GB-SBR-25-12345). UK-based users get GB prefix, international users get their country code. This unique identifier is required for professional music distribution.",
  },
  
  copyright: {
    title: "Copyright Information",
    content: "Copyright protects your original musical work. The copyright year should be when the track was created or first published. The copyright holder is typically the artist, record label, or music publisher who owns the rights to the track.",
  },
  
  publishingRights: {
    title: "Publishing Rights",
    content: "Publishing rights determine how others can use your music:\n\nÔÇó All Rights Reserved: You keep full control\nÔÇó Creative Commons: Others can use with attribution\nÔÇó Public Domain: No restrictions on use",
  },
  
  qualityStandards: {
    title: "Quality Standards",
    content: "Your track is automatically analyzed for:\n\nÔÇó Audio Quality: File format, bitrate, and technical specs\nÔÇó Metadata Completeness: Required information filled out\nÔÇó Professional Standards: Copyright compliance and ISRC generation\n\nHigher scores improve your chances of being featured and discovered.",
  }
};

// Upload tips and best practices
export const uploadTips = {
  audioQuality: [
    "Use high-quality source files (WAV, FLAC) for best results",
    "Avoid over-compression to maintain audio fidelity",
    "Ensure consistent volume levels across your track",
    "Test your track on different devices and speakers"
  ],
  
  metadata: [
    "Fill out all required fields completely",
    "Use consistent artist names across all tracks",
    "Choose accurate and specific genres",
    "Write compelling descriptions to attract listeners"
  ],
  
  professionalStandards: [
    "Ensure you own the rights to all content in your track",
    "Use proper copyright year (when track was created)",
    "Consider registering with a performing rights organization",
    "Keep records of all your musical works"
  ],
  
  coverArt: [
    "Use high-resolution images (1000x1000 pixels minimum)",
    "Ensure artwork is clear and readable at small sizes",
    "Avoid copyrighted images unless you have permission",
    "Make it visually appealing and representative of your music"
  ]
};
