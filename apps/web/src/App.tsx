export function App() {
  return (
    <main>
      <h1>Audire Arcanus</h1>
      <p>Join a lobby with a 6-character code.</p>
      <label>
        Name
        <input id="username" maxLength={32} />
      </label>
      <label>
        Join code
        <input id="join-code" maxLength={6} />
      </label>
      <button type="button">Join</button>
    </main>
  )
}
