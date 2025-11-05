import React from 'react'
import { http } from './http'

export const toDosApi = {
    async list({userId, _page = 1, _limit = 10, _sort = "id", _order = "desc", q}, signal) {
        const params = {userId, _page, _limit, _sort, _order}
        
        // Add search query if provided
        if (q) {
            params.q = q
        }
        
        const config = {
            params,
            signal // Add AbortController signal
        }
        
        const res = await http.get("/todos", config)
        return res.data
    },

    async create(todo) {
        const res = await http.post("/todos", todo, {
            headers: {"Content-Type": "application/json"}
        })
        return res.data
    },

    async remove(id) {
        await http.delete(`/todos/${id}`)
        return true
    },

    async update(id, todo) {
        const res = await http.put(`/todos/${id}`, todo, {
            headers: {"Content-Type": "application/json"}
        })
        return res.data
    }
}