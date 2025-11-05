import React from 'react'
import axios from 'axios'

export const http=axios.create({
    baseURL:"http://localhost:3001/",
    timeout:8000
})