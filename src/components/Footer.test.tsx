import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders the footer element', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the creator link', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'Art Beatte IV' });
    expect(link).toHaveAttribute('href', 'https://artbeatte.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders copyright with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`Copyright © ${year} StockWorks`)).toBeInTheDocument();
  });

  it('renders all rights reserved', () => {
    render(<Footer />);
    expect(screen.getByText('All rights reserved')).toBeInTheDocument();
  });
});
