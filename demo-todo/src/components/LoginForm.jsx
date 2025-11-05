import React, { useState } from 'react'
import { authApi } from '../assets/api/authApi.js';

function LoginForm({setUser}) {
    const [form, setForm] = useState({
        username: "",
        password: ""
    })
    
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);

    function onChange(e) {
        const {name, value} = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value
        }))
    }

    async function onSubmit(e) {
        e.preventDefault();
        
        try {
            setStatus("loading");
            setError(null);
            const user = await authApi.login(form)
            localStorage.setItem("sessionUser", JSON.stringify(user))
            setUser(user)
        }
        catch(err) {
            setStatus("idle")
            setError("Invalid credentials or server error")
        }
    }

    return (
        <form className='form' onSubmit={onSubmit}>
            <h2>Login</h2>
            <input 
                type="text" 
                name="username" 
                placeholder='Enter Username' 
                value={form.username}  
                onChange={onChange}
            />
            <input 
                type="password" 
                name="password" 
                placeholder='Enter Password' 
                value={form.password} 
                onChange={onChange}
            />
            <div className='form-actions'>
                <button type='submit' disabled={status === "loading"}>
                    {status === "loading" ? "Logging in..." : "Login"}
                </button>
            </div>
            {error && <p className='error'>Error: {error}</p>}
        </form>
    )
}

export default LoginForm