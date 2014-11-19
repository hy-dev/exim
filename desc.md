### Actions

Public methods. They need to be called every time the data is mutated.

For example, if you click on button and it must toggle some param of `User` attribute, it must be done through actions.

Actions 

### Stores

Small **GETTER-ONLY** data abstraction.

Method examples: `get`, `getAll`, `getAllForThread`, `getCreatedMessageData`.

**Has no public setters.**  You can't just do `PatientStore = require './store'; PatientStore.set a, b`.

Setters are only internal and are called when actions are called.

### Dispatcher

Each store registers a dispatcher callback.

* `CityStore` will register one
* `CountryStore` will register one

To get correct order of the callback execution, we must use an entity called `dispatchToken`.

```coffeescript
# Idiomatic Flux.

dispatcher = new Dispatcher
CountryStore = {country: null}
CountryStore.dispatchToken = dispatcher.register (payload) ->
  switch payload.actionType
    when 'country-update'
      CountryStore.country = payload.selectedCountry
      CountryStore.emitChange()

CityStore = {city: null}
CityStore.dispatchToken = dispatcher.register (payload) ->
  switch payload.actionType
    when 'city-update'
      CityStore.city = payload.selectedCity
      CityStore.emitChange()
    when 'country-update'
      dispatcher.waitFor [CountryStore.dispatchToken]
      CityStore.city = getDefaultCityForCountry CountryStore.contry
      CityStore.emitChange()

# OR - just like that

CityStore = new Store
  # `token` property => will auto-set
  handler: (type, payload) ->
    switch type
      when 'city-update'
        @city = payload.selectedCity
        CityStore.emit()
      when 'country-update'
        Dispatcher.waitFor [CountryStore.token]
        @city = getDefaultCityForCountry CountryStore.country
        CityStore.emit()


# city-actions
actions =
  selectCity: (name) ->
  selectCountry: (name) ->

# View
class View
  render: ->
    select className: 'country-selector', onChange: @onCountrySelect
      for countryName in countries
        option countryName
    select className: 'city-selector', onChange: @onCitySelect
      for countryName in countries
        option countryName
    h1 "Selected city: @param"

  onCountrySelect: ->
    
  onCitySelect: ->
    

dispatcher.dispatch 'city-update', selectedCity: 'Paris'
dispatcher.dispatch 'country-update', selectedCountry: 'Australia'
```
