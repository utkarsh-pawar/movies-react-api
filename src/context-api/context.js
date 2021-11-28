import React, { useState, useContext} from 'react'
import useFetch from '../fetchedData/useFetch'




const AppContext = React.createContext()

const AppProvider = ({ children }) => {
    const [query, setQuery] = useState('Iron man')
    const { isLoading, error, data: movies } = useFetch(`&s=${query}`)

    return (
        <AppContext.Provider value={{ isLoading, error,movies, query, setQuery }}>
            {children}
        </AppContext.Provider>
    )
}

export const useGlobalContext = () => {
    return useContext(AppContext)
}

export default AppProvider