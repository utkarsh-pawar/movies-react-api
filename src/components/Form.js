import React from 'react'
import classes from './Form.module.css'
import { useGlobalContext } from '../context-api/context'

const Form = () => {

    const { query, setQuery, error } = useGlobalContext()
   
    return (
        <form className={classes.form} onSubmit={(e) => e.preventDefault()}>
            <h2>Search movies</h2>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
            {error.show && <div classname='error'>{error.msg}</div>}

        </form>
    )
}

export default Form
