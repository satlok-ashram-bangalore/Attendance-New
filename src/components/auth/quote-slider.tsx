'use client';

import { useEffect, useState } from 'react';

// Sample spiritual verses/quotes
const quotes = [
  {
    text: 'कबीर, माया मोहनी मोह लिया संसार। विरला कोई जान सके, यह माया को विस्तार।',
    author: 'संत रामपाल जी महाराज',
  },
  {
    text: 'सतगुरु की महिमा अनंत, अनंत किया उपकार। लोचन अनंत उघाड़िया, अनंत दिखावणहार।',
    author: 'संत रामपाल जी महाराज',
  },
  {
    text: 'गुरु बिन ज्ञान न उपजै, गुरु बिन मिटे न भरम। गुरु बिन मोक्ष न पावई, गुरु बिन मिटे न करम।',
    author: 'संत गरीबदास जी महाराज',
  },
  {
    text: 'सतगुरु शब्द सुहावना, जामें झलके नूर। सुरति निरति मन मानिया, रहे सदा भरपूर।',
    author: 'संत रामपाल जी महाराज',
  },
  {
    text: 'सत्य नाम का जाप करो, सत्य नाम का ध्यान। सत्य नाम की भक्ति से, होगा मोक्ष निदान।',
    author: 'संत रामपाल जी महाराज',
  },
];

interface QuoteSliderProps {
  compact?: boolean;
}

export function QuoteSlider({ compact = false }: QuoteSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);

      // Wait for fade-out animation to complete
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % quotes.length);
        setIsAnimating(false);
      }, 500); // Half of the transition duration
    }, 8000); // Change quote every 8 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden">
      <blockquote
        className={`space-y-2  transition-opacity duration-1000 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
      >
        <p
          className={`${compact ? 'text-sm line-clamp-2' : 'text-lg'} font-medium leading-relaxed text-white`}
        >
          {quotes[currentIndex].text}
        </p>
        <footer
          className={`${compact ? 'text-xs mb-1 ' : 'text-sm'} p-2 font-semibold mt-1  text-white/80`}
        >
          — {quotes[currentIndex].author}
        </footer>
      </blockquote>
    </div>
  );
}
