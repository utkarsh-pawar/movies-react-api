import React from 'react'
import { useGlobalContext } from '../context-api/context'
import classes from './Movies.module.css'

import { Link } from 'react-router-dom'
  const url = 'https://upload.wikimedia.org/wikipedia/commons/f/fc/No_picture_available.png'




const Movies = () => {
  const { movies, isLoading } = useGlobalContext()

  if (isLoading) {
    return <div className='loading'>loading...</div>
  }
  return (
    <section className={classes.movies}>
      {Array.from(movies).map((movie) => {
        const { imdbID: id, Poster: poster, Title: title} = movie;
        
       
        return (
          <Link to={`/movies/${id}`} key={id} className={classes.movie}>
            <div>
              <img src={poster === 'N/A' ? url : poster} alt={title} />
              <div className={classes['movie-info']}>
                <h4 className={classes.title}>{title}</h4>
                <p>{movie.Year}</p>
              </div>
            </div>
          </Link>
        )
      })}
    </section>
  )
}

export default Movies