import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpDialog } from './HelpDialog';

describe('HelpDialog', () => {
  it('renders nothing when open is false', () => {
    render(<HelpDialog open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open is true', () => {
    render(<HelpDialog open={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Help and shortcuts' })).toBeInTheDocument();
    expect(screen.getByText('Help & Tips')).toBeInTheDocument();
  });

  it('renders all section headings', () => {
    render(<HelpDialog open={true} onClose={() => {}} />);
    expect(screen.getByText('Adding & Removing Tickers')).toBeInTheDocument();
    expect(screen.getByText('Sorting')).toBeInTheDocument();
    expect(screen.getByText('Searching')).toBeInTheDocument();
    expect(screen.getByText('Column Resizing')).toBeInTheDocument();
    expect(screen.getByText('Data & Export')).toBeInTheDocument();
    expect(screen.getByText('Other Features')).toBeInTheDocument();
  });

  it('renders key help items', () => {
    render(<HelpDialog open={true} onClose={() => {}} />);
    expect(screen.getByText('Multi-column sort')).toBeInTheDocument();
    expect(screen.getByText('Auto-fit column width')).toBeInTheDocument();
    expect(screen.getByText('Cell color coding')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<HelpDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close help'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<HelpDialog open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the overlay is clicked', () => {
    const onClose = vi.fn();
    render(<HelpDialog open={true} onClose={onClose} />);
    // The overlay has role="presentation"
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the dialog body is clicked', () => {
    const onClose = vi.fn();
    render(<HelpDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Help & Tips'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has aria-modal attribute for accessibility', () => {
    render(<HelpDialog open={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});
