import {http} from "./http.js"


export const authApi={
    async login({username,password}){
        const res=await http.get("/users",{params:{username,password}})
        const user=Array.isArray(res.data)?res.data[0]:null;

        if(!user) throw new Error("Invalid Credentials")
        
        return {id:user.id,username:user.username}

    }
}