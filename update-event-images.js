// Simple script to update existing events with placeholder images
// Run this in the browser console on your homepage

async function updateEventImages() {
  try {
    // Get the current events from the homepage
    const events = [
      {
        id: "fd623d22-f52a-4a81-be65-8df9a463c5c8",
        title: "Live Recording",
        placeholder: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&crop=center"
      },
      {
        id: "5be5bde4-ec48-4643-91c5-0e111bef0718", 
        title: "Giveaway Dance Day",
        placeholder: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop&crop=center"
      }
    ];

    // Update each event with a placeholder image
    for (const event of events) {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: event.placeholder
        })
      });

      if (response.ok) {
        console.log(`✅ Updated event: ${event.title}`);
      } else {
        console.error(`❌ Failed to update event: ${event.title}`);
      }
    }

    console.log('🔄 Refreshing page to show updated images...');
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error('Error updating events:', error);
  }
}

// Run the update
updateEventImages();
