package main

import (
	. "github.com/sebkl/gotojs"
	"log"
)

func main() {
	server := NewContainer()
	server.EnableFileServer("htdocs", "p")
	server.Redirect("/", "/p/")
	log.Fatal(server.Start(":8080"))
}
