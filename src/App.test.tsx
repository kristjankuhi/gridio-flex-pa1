import { render, screen } from '@testing-library/react';

describe('Testing infrastructure', () => {
  it('renders and queries DOM with jest-dom matchers', () => {
    render(<div data-testid="hello">Hello</div>);
    expect(screen.getByTestId('hello')).toBeInTheDocument();
  });
});
