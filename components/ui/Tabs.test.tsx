import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

const items = [
  { id: 'genel', label: 'Genel' },
  { id: 'oyunlar', label: 'Oyunlar', disabled: true },
  { id: 'oduller', label: 'Ödüller' },
];

describe('Tabs', () => {
  it('renders all tabs with correct accessibility attributes', () => {
    render(<Tabs items={items} active="genel" onChange={() => {}} data-testid="tabs" />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toBeDisabled();
    expect(tabs[1]).toHaveAttribute('aria-disabled', 'true');
  });

  it('applies data-testid per tab', () => {
    render(<Tabs items={items} active="genel" onChange={() => {}} data-testid="tabs" />);
    expect(screen.getByTestId('tabs-genel')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-oyunlar')).toBeInTheDocument();
  });

  it('calls onChange with the clicked tab id', () => {
    const onChange = jest.fn();
    render(<Tabs items={items} active="genel" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Ödüller' }));
    expect(onChange).toHaveBeenCalledWith('oduller');
  });

  it('does not fire onChange for disabled tabs', () => {
    const onChange = jest.fn();
    render(<Tabs items={items} active="genel" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Oyunlar' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
