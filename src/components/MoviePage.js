import React from 'react'
import { useParams, Link } from 'react-router-dom'
import useFetch from '../fetchedData/useFetch'
import classes from './MoviePage.module.css'
const MoviePage = () => {
    const { id } = useParams();
    const { isLoading, error, data: movie } = useFetch(`&i=${id}`)

    if (isLoading) {
        return <div className='loading'></div>
    }
    if (error.show) {
        return (
            <div className='page-error'>
                <h1 style={{ 'color': 'white' }}>{error.msg}</h1>
                <Link to='/' className='btn'>
                    back to movies
        </Link>
            </div>
        )
    }
    const { Poster: poster, Title: title, Plot: plot } = movie;
    return (
        <section className={classes['movie-page']}>
            <img src={poster} alt={title} />
            <div className={classes['movie-page__info']} style={{ 'color': 'white' }}>
                <h2>{title} ({movie.Year})</h2>
                <p>{plot}</p>

                <Link to='/' >
                    <button className={classes.btn}>Back to Search</button>
                </Link>
            </div>
        </section>
    )
}

export default MoviePage