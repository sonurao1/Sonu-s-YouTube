class ApiResponse {
     constructor(statusCode,data, message ="Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = success < 400 
     }
}

export {
   ApiResponse
}