/**
 * DEV ONLY: Seed 50 movie documents for testing pagination.
 * Hit GET /api/seed-movies while logged in to the admin.
 */
import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MOVIES = [
	{ title: 'The Shawshank Redemption', releaseDate: '1994-09-23', director: 'Frank Darabont' },
	{ title: 'The Godfather', releaseDate: '1972-03-24', director: 'Francis Ford Coppola' },
	{ title: 'The Dark Knight', releaseDate: '2008-07-18', director: 'Christopher Nolan' },
	{ title: 'Pulp Fiction', releaseDate: '1994-10-14', director: 'Quentin Tarantino' },
	{ title: 'Schindler\'s List', releaseDate: '1993-12-15', director: 'Steven Spielberg' },
	{ title: 'The Lord of the Rings: The Return of the King', releaseDate: '2003-12-17', director: 'Peter Jackson' },
	{ title: 'Fight Club', releaseDate: '1999-10-15', director: 'David Fincher' },
	{ title: 'Forrest Gump', releaseDate: '1994-07-06', director: 'Robert Zemeckis' },
	{ title: 'Inception', releaseDate: '2010-07-16', director: 'Christopher Nolan' },
	{ title: 'The Matrix', releaseDate: '1999-03-31', director: 'The Wachowskis' },
	{ title: 'Goodfellas', releaseDate: '1990-09-19', director: 'Martin Scorsese' },
	{ title: 'Star Wars: Episode V', releaseDate: '1980-05-21', director: 'Irvin Kershner' },
	{ title: 'Interstellar', releaseDate: '2014-11-07', director: 'Christopher Nolan' },
	{ title: 'City of God', releaseDate: '2002-08-30', director: 'Fernando Meirelles' },
	{ title: 'Spirited Away', releaseDate: '2001-07-20', director: 'Hayao Miyazaki' },
	{ title: 'Saving Private Ryan', releaseDate: '1998-07-24', director: 'Steven Spielberg' },
	{ title: 'The Silence of the Lambs', releaseDate: '1991-02-14', director: 'Jonathan Demme' },
	{ title: 'Life Is Beautiful', releaseDate: '1997-12-20', director: 'Roberto Benigni' },
	{ title: 'Se7en', releaseDate: '1995-09-22', director: 'David Fincher' },
	{ title: 'The Usual Suspects', releaseDate: '1995-08-16', director: 'Bryan Singer' },
	{ title: 'Léon: The Professional', releaseDate: '1994-09-14', director: 'Luc Besson' },
	{ title: 'Whiplash', releaseDate: '2014-10-10', director: 'Damien Chazelle' },
	{ title: 'The Prestige', releaseDate: '2006-10-20', director: 'Christopher Nolan' },
	{ title: 'The Departed', releaseDate: '2006-10-06', director: 'Martin Scorsese' },
	{ title: 'Gladiator', releaseDate: '2000-05-05', director: 'Ridley Scott' },
	{ title: 'Memento', releaseDate: '2000-10-11', director: 'Christopher Nolan' },
	{ title: 'American History X', releaseDate: '1998-10-30', director: 'Tony Kaye' },
	{ title: 'The Pianist', releaseDate: '2002-09-24', director: 'Roman Polanski' },
	{ title: 'Terminator 2: Judgment Day', releaseDate: '1991-07-03', director: 'James Cameron' },
	{ title: 'Back to the Future', releaseDate: '1985-07-03', director: 'Robert Zemeckis' },
	{ title: 'Alien', releaseDate: '1979-05-25', director: 'Ridley Scott' },
	{ title: 'Apocalypse Now', releaseDate: '1979-08-15', director: 'Francis Ford Coppola' },
	{ title: 'Raiders of the Lost Ark', releaseDate: '1981-06-12', director: 'Steven Spielberg' },
	{ title: 'Django Unchained', releaseDate: '2012-12-25', director: 'Quentin Tarantino' },
	{ title: 'The Lion King', releaseDate: '1994-06-24', director: 'Roger Allers' },
	{ title: 'WALL·E', releaseDate: '2008-06-27', director: 'Andrew Stanton' },
	{ title: 'Parasite', releaseDate: '2019-05-30', director: 'Bong Joon-ho' },
	{ title: 'The Grand Budapest Hotel', releaseDate: '2014-03-28', director: 'Wes Anderson' },
	{ title: 'No Country for Old Men', releaseDate: '2007-11-09', director: 'Joel & Ethan Coen' },
	{ title: 'Blade Runner 2049', releaseDate: '2017-10-06', director: 'Denis Villeneuve' },
	{ title: 'Mad Max: Fury Road', releaseDate: '2015-05-15', director: 'George Miller' },
	{ title: 'The Truman Show', releaseDate: '1998-06-05', director: 'Peter Weir' },
	{ title: 'Eternal Sunshine of the Spotless Mind', releaseDate: '2004-03-19', director: 'Michel Gondry' },
	{ title: 'Oldboy', releaseDate: '2003-11-21', director: 'Park Chan-wook' },
	{ title: 'There Will Be Blood', releaseDate: '2007-12-26', director: 'Paul Thomas Anderson' },
	{ title: 'Taxi Driver', releaseDate: '1976-02-08', director: 'Martin Scorsese' },
	{ title: 'Reservoir Dogs', releaseDate: '1992-10-23', director: 'Quentin Tarantino' },
	{ title: 'Jaws', releaseDate: '1975-06-20', director: 'Steven Spielberg' },
	{ title: 'The Thing', releaseDate: '1982-06-25', director: 'John Carpenter' },
	{ title: 'Dune: Part Two', releaseDate: '2024-03-01', director: 'Denis Villeneuve' },
];

export const GET: RequestHandler = async ({ locals }) => {
	if (!dev) {
		error(404, 'Not found');
	}

	const { localAPI } = locals.aphexCMS;
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		error(401, 'You must be logged in. Visit /admin first.');
	}

	const context = {
		organizationId: auth.organizationId,
		user: auth.user,
		auth
	};

	const collection = localAPI.collections.movie;
	if (!collection) {
		error(400, 'No "movie" collection found. Make sure the movie schema is registered.');
	}

	let created = 0;
	const errors: string[] = [];

	for (const movie of MOVIES) {
		try {
			await collection.create(context, {
				title: movie.title,
				releaseDate: movie.releaseDate,
				director: movie.director,
				synopsis: `${movie.title} is a film directed by ${movie.director}, released on ${movie.releaseDate}.`
			});
			created++;
		} catch (err) {
			errors.push(`Failed to create "${movie.title}": ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	return json({
		success: true,
		message: `Created ${created} movies out of ${MOVIES.length}`,
		errors: errors.length > 0 ? errors : undefined
	});
};
