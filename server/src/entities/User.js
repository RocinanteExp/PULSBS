/**
 * User entity
 * @author Gastaldi Paolo
 * @version 1.0.0
 */
'use strict';

class User {
    /**
     * class constructor
     * @param {Number} userId 
     * @param {String} firstName 
     * @param {String} lastName 
     * @param {String} email 
     * @param {String} password 
     */
    constructor(userId = -1, firstName = null, lastName = null, email = null, password = null) {
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
    }

    /**
     * create a new user from a generic object
     * @param {Object} obj
     * @returns {User} new user
     */
    static from(obj){
        const user = Object.assign(new User(), obj);
        user.password = null; // default security option
        return user;
    }
}

module.exports = User;