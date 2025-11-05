import { useEffect, useState } from 'react'
import LoginForm from './components/LoginForm'
import './App.css'
import TodoList from './components/TodoList'

function App() {
  const [user, setUser] = useState(null) // Initialize as null, not an object

  useEffect(() => {
    const raw = localStorage.getItem("sessionUser")
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch (error) {
        console.error("Error parsing session user:", error)
        localStorage.removeItem("sessionUser")
      }
    }
  }, [])

  function logout() {
    localStorage.removeItem("sessionUser")
    setUser(null)
  }

  return (
    <>
      <main className="container">
        <header className='header'>
          <h1>ToDo List</h1>
          {user && (
            <div className='user-info'>
              <span>Hi, {user.username}</span>
              <button onClick={logout}>Logout</button>
            </div>
          )}
        </header>
        {!user ? (
          <LoginForm setUser={setUser} />
        ) : (
          <TodoList user={user} />
        )}
      </main>
    </>
  )
}

export default App