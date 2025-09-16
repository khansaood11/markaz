import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-secondary">
      <div className="container mx-auto py-6 text-center text-muted-foreground space-y-2">
        <p>&copy; {currentYear} Masjid e Aaisha Qadeem. All rights reserved.</p>
        <p className="text-sm">
          Developed by{' '}
          <a
            href="https://portfolio.khansaood.online"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Khan Saood
          </a>
        </p>
      </div>
    </footer>
  );
}
