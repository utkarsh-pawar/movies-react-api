import React from 'react'
import Form from './Form'
import Movies from './Movies'
import classes from './Home.module.css'

const Home = () => {
    return (
        <div className={classes.home}>
            <Form />
            <Movies />
        </div>
    )
}

export default Home
