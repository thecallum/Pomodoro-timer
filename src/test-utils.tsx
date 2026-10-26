import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router'
import App from '@/App'

/** Renders the whole app the way main.tsx does, starting at the given route. */
export function renderApp(route = '/') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )
}
