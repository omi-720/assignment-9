import React, { useEffect, useState, useRef } from 'react'
import {toDosApi} from '../assets/api/toDosApi.js'
import ToDoForm from './ToDoForm.jsx'

function TodoList({user}) {
    const [todos,setTodos]=useState([])
    const [status,setStatus]=useState("idle")
    const [error,setError]=useState(null)
    const [page,setPage] =useState(1)
    const [searchTerm, setSearchTerm] = useState("")
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const limit = 5;
    
    // Refs for debounce and abort controller
    const debounceTimeoutRef = useRef(null)
    const abortControllerRef = useRef(null)

    // Load todos when user.id or page changes
    useEffect(()=>{
        if (user?.id) {
            loadTodos()
        }
    },[user?.id, page])

    // Debounced search effect - this was the main issue
    useEffect(() => {
        // Clear existing timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }

        // Set new timeout for debounced search
        debounceTimeoutRef.current = setTimeout(() => {
            // Reset to first page when searching
            if (page !== 1) {
                setPage(1) // This will trigger the loadTodos via the page useEffect
            } else {
                loadTodos() // If already on page 1, load directly
            }
        }, 500) // 500ms debounce

        // Cleanup function
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
        }
    }, [searchTerm]) // Only depend on searchTerm

    async function loadTodos() {
        if (!user?.id) return;

        // Cancel previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController()

        try {
            setStatus("loading")
            setError(null)
            
            const params = {
                userId: user.id,
                _page: page,
                _limit: limit,
                _sort: "id",
                _order: "desc"
            }
            
            // Add search term if exists and not empty
            if (searchTerm && searchTerm.trim()) {
                params.q = searchTerm.trim()
            }

            console.log('Loading todos with params:', params) // Debug log

            const data = await toDosApi.list(params, abortControllerRef.current.signal)
            
            console.log('Received data:', data) // Debug log
            
            setStatus("idle")
            
            // Handle different response formats
            if (data.todos && Array.isArray(data.todos)) {
                // Paginated response format
                setTodos(data.todos)
                setTotalCount(data.total || 0)
                setTotalPages(Math.ceil((data.total || 0) / limit))
            } else if (Array.isArray(data)) {
                // Simple array response format
                setTodos(data)
                setTotalCount(data.length)
                setTotalPages(Math.ceil(data.length / limit))
            } else {
                // Unexpected format
                console.warn('Unexpected data format:', data)
                setTodos([])
                setTotalCount(0)
                setTotalPages(1)
            }
        }
        catch(err) {
            if (err.name === 'AbortError') {
                console.log('Request aborted') // Debug log
                return // Request was cancelled, don't update state
            }
            
            console.error('Error loading todos:', err) // Debug log
            setStatus("idle")
            setError(err.message || 'Failed to load todos')
        }
    }

    function handleCreated(newTodo){
        // Add new todo to the beginning of the list
        setTodos(prev=>[newTodo, ...prev])
        
        // Update counts
        setTotalCount(prev => prev + 1)
        const newTotal = totalCount + 1
        setTotalPages(Math.ceil(newTotal / limit))
    }

    async function handleEdit(id) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        const newTitle = prompt("Edit todo title:", todo.title);
        if (!newTitle || newTitle.trim() === todo.title.trim()) return;

        const updatedTodo = { ...todo, title: newTitle.trim() };
        
        // Optimistic UI update
        setTodos(prev => prev.map(t => (t.id === id ? updatedTodo : t)));

        try {
            await toDosApi.update(id, updatedTodo);
        } catch (err) {
            console.error('Edit failed:', err)
            alert("Update failed: " + err.message);
            // Rollback on failure
            setTodos(prev => prev.map(t => (t.id === id ? todo : t)));
        }
    }

    async function handleToggleComplete(id) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        const updatedTodo = { ...todo, completed: !todo.completed };
        
        // Optimistic UI update
        setTodos(prev => prev.map(t => (t.id === id ? updatedTodo : t)));

        try {
            await toDosApi.update(id, updatedTodo);
        } catch (err) {
            console.error('Toggle failed:', err)
            alert("Update failed: " + err.message);
            // Rollback on failure
            setTodos(prev => prev.map(t => (t.id === id ? todo : t)));
        }
    }

    async function handleDelete(id){
        const ok = confirm("Delete this todo?")
        if(!ok) return;
        
        const todoToDelete = todos.find(t => t.id === id);
        if (!todoToDelete) return;

        // Optimistic UI update
        setTodos(prev => prev.filter(t => t.id !== id));
        
        // Update counts
        const newTotal = totalCount - 1
        setTotalCount(newTotal)
        const newTotalPages = Math.max(1, Math.ceil(newTotal / limit))
        setTotalPages(newTotalPages)
        
        // If current page becomes invalid, go to last valid page
        if (page > newTotalPages) {
            setPage(newTotalPages)
        }
          
        try{
            await toDosApi.remove(id)
        }catch(err){
            console.error('Delete failed:', err)
            alert("Delete failed: " + err.message)
            
            // Rollback on failure
            setTodos(prev => {
                // Insert the todo back in the correct position
                const newList = [...prev, todoToDelete]
                return newList.sort((a, b) => b.id - a.id) // Sort by ID descending
            });
            setTotalCount(totalCount) // Restore count
            setTotalPages(Math.ceil(totalCount / limit)) // Restore pages
        }
    }

    function handleSearchChange(e) {
        setSearchTerm(e.target.value)
    }

    function goToPage(newPage) {
        if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
            setPage(newPage)
        }
    }

    function clearSearch() {
        setSearchTerm("")
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
        }
    }, [])

   return (
        <section>
            <ToDoForm userId={user.id} handleCreated={handleCreated}/>
            
            {/* Search Input with Clear Button */}
            <div style={{ marginBottom: '16px', position: 'relative', display: 'inline-block' }}>
                <input
                    type="text"
                    placeholder="Search todos..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={{ 
                        width: '300px',
                        paddingRight: searchTerm ? '30px' : '10px',
                        paddingLeft: '10px',
                        paddingTop: '6px',
                        paddingBottom: '6px'
                    }}
                />
                {searchTerm && (
                    <button
                        onClick={clearSearch}
                        style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px',
                            color: '#999',
                            padding: '0',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className='pagination'>
                    <button 
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 1 || status === "loading"}
                    >
                        ← Prev
                    </button>
                    
                    <span style={{ margin: '0 8px' }}>
                        Page {page} of {totalPages} ({totalCount} items)
                    </span>
                    
                    <button 
                        onClick={() => goToPage(page + 1)}
                        disabled={page === totalPages || status === "loading"}
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Loading State */}
            {status === "loading" && (
                <p className='status'>
                    {searchTerm ? 'Searching...' : 'Loading Todos...'}
                </p>
            )}
            
            {/* Error State */}
            {error && <p className='error'>Error: {error}</p>}
            
            {/* Empty State */}
            {status === "idle" && todos.length === 0 && (
                <p>
                    {searchTerm 
                        ? `No todos found matching "${searchTerm}".` 
                        : 'No Todos Yet'
                    }
                </p>
            )}

            {/* Todos List */}
            {status === "idle" && todos.length > 0 && (
                <>
                    {searchTerm && (
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                            Found {totalCount} todo{totalCount !== 1 ? 's' : ''} matching "{searchTerm}"
                        </p>
                    )}
                    <ul className='todo-list'>
                        {todos.map((t) => {
                            return (
                                <li key={t.id} className='todo-item'>
                                    <label className='todo-label'>
                                        <input 
                                            type="checkbox" 
                                            checked={t.completed || false}
                                            onChange={() => handleToggleComplete(t.id)}
                                        />
                                        <span className={t.completed ? "completed" : ""}>
                                            {t.title}
                                        </span>
                                    </label>
                                    <div>
                                        <button 
                                            className='edit-btn' 
                                            onClick={() => handleEdit(t.id)}
                                            disabled={status === "loading"}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            className='delete-btn' 
                                            onClick={() => handleDelete(t.id)}
                                            disabled={status === "loading"}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </>
            )}

            {/* Debug Info (remove in production) */}
            
        </section>
    )
}

export default TodoList